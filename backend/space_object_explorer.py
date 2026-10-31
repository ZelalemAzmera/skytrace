#!/usr/bin/env python3
"""Solar System & Space Object Explorer (research-oriented starter).

Queries JPL Horizons for supported Solar System objects, optionally propagates a
hypothetical Planet X using a Sun-only Kepler model, and optionally discovers
SPHEREx archive products near a sky coordinate. Writes CSV and an orbit plot.

Limitations: not every star, spacecraft, or debris object is catalogued/public;
Planet X is hypothetical; its default orientation/phase are arbitrary assumptions;
its orbit here is not a full N-body prediction. SPHEREx archive discovery is not
itself a Planet X detection or a full spectral-fitting pipeline.

Install: python -m pip install -r requirements_space_object_explorer.txt
Examples:
 python space_object_explorer.py --start 2026-10-28 --end 2026-11-07 --step '1 d'
 python space_object_explorer.py --objects 'Mars,Jupiter,Saturn,Neptune,Pluto'
 python space_object_explorer.py --planet-x --start 2026-01-01 --end 2027-01-01 --step '7 d'
 python space_object_explorer.py --spherex-ra 150.1 --spherex-dec 2.2 --spherex-radius 0.1
"""
from __future__ import annotations
import argparse, csv, math, sys, io
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import requests
try:
    from astropy.time import Time
except ImportError as exc:
    raise SystemExit('Missing packages. Run: python -m pip install -r requirements_space_object_explorer.txt') from exc
try:  # optional: only needed for live JPL Horizons queries (not for the Planet X report)
    from astroquery.jplhorizons import Horizons
except ImportError:
    Horizons = None

SPHEREX_SIA_URL = 'https://irsa.ipac.caltech.edu/SIA'
MU_SUN_AU3_DAY2 = 0.0002959122082855911
DEFAULT_OBJECTS = {'Sun':'10','Mercury':'199','Venus':'299','Earth':'399','Moon':'301','Mars':'499','Jupiter':'599','Saturn':'699','Uranus':'799','Neptune':'899','Pluto':'999'}

def parse_datetime(value: str) -> datetime:
    value = value.strip().replace('Z', '+00:00')
    try: dt = datetime.fromisoformat(value)
    except ValueError as exc: raise argparse.ArgumentTypeError(f'Invalid date/time {value!r}; use YYYY-MM-DD or ISO datetime.') from exc
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def parse_step(value: str) -> float:
    parts = value.strip().lower().split()
    if len(parts) == 1:
        try: return float(parts[0])
        except ValueError as exc: raise ValueError("Use a step like '1 d', '12 h', or '30 d'.") from exc
    if len(parts) != 2: raise ValueError("Use a step like '1 d', '12 h', or '30 d'.")
    amount, unit = float(parts[0]), parts[1]
    factors = {'d':1, 'day':1, 'days':1, 'h':1/24, 'hr':1/24, 'hour':1/24, 'hours':1/24, 'm':1/1440, 'min':1/1440, 'minute':1/1440, 'minutes':1/1440, 'y':365.25, 'yr':365.25, 'year':365.25, 'years':365.25}
    if unit not in factors: raise ValueError('Supported units: m (minutes), h (hours), d (days), y (years).')
    step = amount*factors[unit]
    if step <= 0: raise ValueError('Step must be positive.')
    return step

def make_epochs(start: datetime, end: datetime, step_days: float):
    if end < start: raise ValueError('--end must be on or after --start.')
    a, b = float(Time(start, scale='utc').jd), float(Time(end, scale='utc').jd)
    n = int(math.floor((b-a)/step_days))+1
    if n > 2000: raise ValueError(f'{n} epochs requested; maximum is 2000 per run. Increase --step.')
    jds = [a+i*step_days for i in range(n)]
    if jds[-1] < b-1e-8 and len(jds) < 2000: jds.append(b)
    labels = [Time(jd, format='jd', scale='utc').isot for jd in jds]
    return jds, labels

def resolve_target(name: str) -> str:
    for known, target_id in DEFAULT_OBJECTS.items():
        if name.strip().lower() == known.lower(): return target_id
    return name.strip()  # Horizons may accept a name, designation, or ID.

def query_horizons(target: str, jds: list[float], label: str) -> list[dict]:
    if Horizons is None and target != '10': raise RuntimeError('astroquery is not installed; run: pip install astroquery')
    print(f'[Horizons] Querying {label} ({target}) at {len(jds)} epoch(s)...')
    if target == '10':  # Sun relative to itself
        return [{'datetime_utc':l,'object':label,'source':'identity','frame':'heliocentric ecliptic (Horizons vectors)','x_au':0.0,'y_au':0.0,'z_au':0.0,'vx_au_day':0.0,'vy_au_day':0.0,'vz_au_day':0.0,'distance_au':0.0,'speed_au_day':0.0,'note':'Sun at origin by definition.'} for l in [Time(j,format='jd',scale='utc').isot for j in jds]]
    tdb = [float(Time(j, format='jd', scale='utc').tdb.jd) for j in jds]  # Horizons numeric epochs are TDB
    try: result = Horizons(id=target, location='@sun', epochs=tdb, id_type=None).vectors(refplane='ecliptic')
    except Exception as exc: raise RuntimeError(f'Horizons query failed for {label!r} ({target!r}): {exc}') from exc
    rows=[]
    for item in result:
        rows.append({'datetime_utc':Time(float(item['datetime_jd']),format='jd',scale='tdb').utc.isot,'object':label,'source':'JPL Horizons','frame':'heliocentric ecliptic (Horizons vectors)','x_au':float(item['x']),'y_au':float(item['y']),'z_au':float(item['z']),'vx_au_day':float(item['vx']),'vy_au_day':float(item['vy']),'vz_au_day':float(item['vz']),'distance_au':float(item['range']),'speed_au_day':float(math.sqrt(item['vx']**2+item['vy']**2+item['vz']**2)),'note':'Ephemeris result; accuracy depends on object, orbit quality, and epoch.'})
    return rows

def solve_kepler(M: float, e: float) -> float:
    M %= 2*math.pi; E = M if e < .8 else math.pi
    for _ in range(100):
        delta = (E-e*math.sin(E)-M)/(1-e*math.cos(E)); E -= delta
        if abs(delta) < 1e-13: return E
    raise RuntimeError('Kepler equation did not converge.')

def rotation_matrix(node_deg: float, inc_deg: float, arg_deg: float) -> np.ndarray:
    O,i,w = map(math.radians,(node_deg,inc_deg,arg_deg)); cO,sO,ci,si,cw,sw=math.cos(O),math.sin(O),math.cos(i),math.sin(i),math.cos(w),math.sin(w)
    return np.array([[cO*cw-sO*sw*ci,-cO*sw-sO*cw*ci,sO*si],[sO*cw+cO*sw*ci,-sO*sw+cO*cw*ci,-cO*si],[sw*si,cw*si,ci]])

def propagate_planet_x(jds, labels, a, e, inc, node, arg_peri, M0_deg, epoch_jd, mass_earth):
    if a <= 0 or not 0 <= e < 1 or mass_earth <= 0: raise ValueError('Require a>0, 0<=e<1, and mass>0.')
    n = math.sqrt(MU_SUN_AU3_DAY2/a**3); M0=math.radians(M0_deg); rot=rotation_matrix(node,inc,arg_peri); rows=[]
    for jd,label in zip(jds,labels):
        E=solve_kepler(M0+n*(jd-epoch_jd),e); den=1-e*math.cos(E)
        p=rot@np.array([a*(math.cos(E)-e),a*math.sqrt(1-e*e)*math.sin(E),0.0])
        v=rot@np.array([-a*n*math.sin(E)/den,a*n*math.sqrt(1-e*e)*math.cos(E)/den,0.0])
        rows.append({'datetime_utc':label,'object':'Planet X (hypothetical)','source':'Local two-body Kepler model','frame':'heliocentric ecliptic; orientation assumed','x_au':float(p[0]),'y_au':float(p[1]),'z_au':float(p[2]),'vx_au_day':float(v[0]),'vy_au_day':float(v[1]),'vz_au_day':float(v[2]),'distance_au':float(np.linalg.norm(p)),'speed_au_day':float(np.linalg.norm(v)),'note':f'ASSUMPTION: a={a} AU, e={e}, i={inc} deg, node={node} deg, arg_peri={arg_peri} deg, M0={M0_deg} deg at JD {epoch_jd}; mass={mass_earth} Earth masses (NOT used in dynamics). Not confirmed; Sun-only approximation.'})
    return rows

def query_spherex(ra, dec, radius):
    if not -90 <= dec <= 90: raise ValueError('Declination must be in [-90,90] degrees.')
    if radius <= 0: raise ValueError('Search radius must be positive.')
    params={'COLLECTION':'spherex_qr3','POS':f'circle {ra} {dec} {radius}','RESPONSEFORMAT':'CSV'}
    print('[SPHEREx] Discovering IRSA archive products near the supplied sky position...')
    response=requests.get(SPHEREX_SIA_URL,params=params,timeout=60); response.raise_for_status()
    text=response.text.strip()
    if not text: return []
    rows=[]
    for record in csv.DictReader(io.StringIO(text)):
        rows.append({'collection':'spherex_qr3','query_ra_deg':ra,'query_dec_deg':dec,'query_radius_deg':radius,'obs_id':record.get('obs_id') or record.get('observation_id') or '', 'dataproduct_type':record.get('dataproduct_type') or '', 'access_url':record.get('access_url') or '', 'cloud_access':record.get('cloud_access') or '', 'metadata':str(record)})
    return rows

# ---------------------------------------------------------------------------
# SkyTrace calculation engine (importable; no I/O, no printing)
# ---------------------------------------------------------------------------
OBLIQUITY_J2000_DEG = 23.4392911
AU_PER_PC_ARCSEC = 1.0  # 1 AU baseline subtending 1 arcsec == 1 parsec
PC_TO_LY = 3.26156
SPHEREX_PIXEL_SCALE_ARCSEC = 6.2

def ecliptic_to_icrs_vector(v):
    """Rotate a J2000 ecliptic vector to the equatorial (ICRS ~ J2000) frame."""
    e = math.radians(OBLIQUITY_J2000_DEG); c, s = math.cos(e), math.sin(e)
    x, y, z = v
    return np.array([x, c*y - s*z, s*y + c*z])

def vector_to_ra_dec(v):
    """Direction of vector -> (RA deg in [0,360), Dec deg)."""
    x, y, z = v; r = math.sqrt(x*x+y*y+z*z)
    if r == 0: raise ValueError('Zero vector has no direction.')
    return math.degrees(math.atan2(y, x)) % 360.0, math.degrees(math.asin(max(-1.0, min(1.0, z/r))))

def geocentric_sky_position(obj_helio_ecl, earth_helio_ecl):
    """Apparent geocentric RA/Dec (deg) and distance (AU) from heliocentric ecliptic vectors.
    Geometric only: no light-time, aberration, or deflection (negligible vs 6.2 arcsec/px for distant objects)."""
    d = np.asarray(obj_helio_ecl, float) - np.asarray(earth_helio_ecl, float)
    ra, dec = vector_to_ra_dec(ecliptic_to_icrs_vector(d))
    return {'ra_deg': ra, 'dec_deg': dec, 'geocentric_distance_au': float(np.linalg.norm(d))}

def parallax_distance(shift_arcsec, earth1_helio_ecl, earth2_helio_ecl, ra_deg, dec_deg):
    """Distance from the apparent shift between two epochs using the ACTUAL Earth baseline.

    Only the baseline component perpendicular to the line of sight produces parallax:
        B_perp = |b - (b . n) n|,  b = earth2 - earth1 (AU),  n = unit vector toward (ra, dec)
        d_pc = B_perp_AU / shift_arcsec            (small-angle; 1 AU @ 1 pc = 1 arcsec)
    Assumes the object is stationary; any proper/orbital motion is folded into the shift
    (so the result is a lower limit on distance if the object itself moves).
    Returns dict with baseline, distance_pc, distance_ly; distance is None if unmeasurable."""
    if shift_arcsec < 0: raise ValueError('shift_arcsec must be >= 0.')
    b = ecliptic_to_icrs_vector(np.asarray(earth2_helio_ecl, float) - np.asarray(earth1_helio_ecl, float))
    r, d = math.radians(ra_deg), math.radians(dec_deg)
    n = np.array([math.cos(d)*math.cos(r), math.cos(d)*math.sin(r), math.sin(d)])
    b_perp = float(np.linalg.norm(b - np.dot(b, n)*n))
    out = {'baseline_au': float(np.linalg.norm(b)), 'baseline_perp_au': b_perp, 'shift_arcsec': shift_arcsec, 'distance_pc': None, 'distance_ly': None}
    if shift_arcsec > 1e-3 and b_perp > 1e-6:
        pc = b_perp / shift_arcsec; out['distance_pc'] = pc; out['distance_ly'] = pc*PC_TO_LY
    return out

def pixel_shift_to_arcsec(pixel_shift, pixel_scale=SPHEREX_PIXEL_SCALE_ARCSEC):
    return abs(pixel_shift)*pixel_scale

def planet_x_sky_track(jds, labels, earth_rows, **px):
    """Planet X geocentric RA/Dec per epoch. earth_rows: Horizons rows for Earth on the SAME epochs."""
    if len(earth_rows) != len(jds): raise ValueError('earth_rows must match epochs.')
    rows = propagate_planet_x(jds, labels, **px); out = []
    for r, e in zip(rows, earth_rows):
        g = geocentric_sky_position((r['x_au'], r['y_au'], r['z_au']), (e['x_au'], e['y_au'], e['z_au']))
        out.append({**g, 'datetime_utc': r['datetime_utc'], 'object': r['object']})
    return out

class PositionTrack:
    """Per-survey-pass (~6 month) position history. Epoch number = list index.
    Velocity from the last two epochs; linear prediction of the heliocentric position."""
    def __init__(self): self.epochs = []

    def add(self, jd, helio_ecl_xyz):
        self.epochs.append({'n': len(self.epochs), 'jd': float(jd), 'p': np.asarray(helio_ecl_xyz, float)})
        return len(self.epochs) - 1

    def velocity(self):
        """AU/day from the last two epochs."""
        if len(self.epochs) < 2: raise ValueError('Need at least 2 epochs.')
        a, b = self.epochs[-2], self.epochs[-1]
        if b['jd'] == a['jd']: raise ValueError('Epochs must differ in time.')
        return (b['p'] - a['p']) / (b['jd'] - a['jd'])

    def predict(self, jd, earth_helio_ecl_at_jd=None):
        last = self.epochs[-1]; p = last['p'] + self.velocity() * (float(jd) - last['jd'])
        out = {'helio_xyz': p}
        if earth_helio_ecl_at_jd is not None: out.update(geocentric_sky_position(p, earth_helio_ecl_at_jd))
        return out

def compute(start, end, step='1 d', objects=('Earth',), planet_x=None, with_sky_position=True):
    """One-call engine for the SkyTrace backend. Returns {'ephemerides': [...], 'sky_positions': [...]}.
    start/end: ISO strings or datetimes (UTC). planet_x: dict of propagate_planet_x kwargs
    (a,e,inc,node,arg_peri,M0_deg,epoch_jd,mass_earth) or None. Raises on failure (no printing)."""
    s = start if isinstance(start, datetime) else parse_datetime(start)
    e = end if isinstance(end, datetime) else parse_datetime(end)
    jds, labels = make_epochs(s, e, parse_step(step))
    rows = []
    for name in objects: rows.extend(query_horizons(resolve_target(name), jds, name))
    result = {'ephemerides': list(rows), 'sky_positions': []}  # copy: Planet X rows must not re-enter the loop below
    earth = [r for r in rows if r['object'].lower() == 'earth'] or (query_horizons('399', jds, 'Earth') if (with_sky_position or planet_x) else [])
    if planet_x is not None:
        px_rows = propagate_planet_x(jds, labels, **planet_x); result['ephemerides'].extend(px_rows)
        if earth and with_sky_position: result['sky_positions'].extend(planet_x_sky_track(jds, labels, earth, **planet_x))
    if with_sky_position and earth:
        for r in rows:
            if r['object'].lower() in ('earth', 'sun'): continue
            idx = [x for x in rows if x['object'] == r['object']].index(r)
            g = geocentric_sky_position((r['x_au'], r['y_au'], r['z_au']), (earth[idx]['x_au'], earth[idx]['y_au'], earth[idx]['z_au']))
            result['sky_positions'].append({**g, 'datetime_utc': r['datetime_utc'], 'object': r['object']})
    return result

def write_csv(path: Path, rows: list[dict]):
    path.parent.mkdir(parents=True,exist_ok=True)
    if not rows: print(f'No rows to write: {path}'); return
    keys=list(dict.fromkeys(k for row in rows for k in row))
    with path.open('w',newline='',encoding='utf-8') as f:
        writer=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore'); writer.writeheader(); writer.writerows(rows)
    print(f'Wrote {len(rows)} rows: {path.resolve()}')

def render_plot(rows, path: Path):
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
    except ImportError: print('Matplotlib missing; skipping plot.'); return
    names=sorted({r['object'] for r in rows}); fig=plt.figure(figsize=(13,6)); ax=fig.add_subplot(1,2,1); ax3=fig.add_subplot(1,2,2,projection='3d')
    for name in names:
        subset=[r for r in rows if r['object']==name]
        x=np.array([r['x_au'] for r in subset]); y=np.array([r['y_au'] for r in subset]); z=np.array([r['z_au'] for r in subset])
        ax.plot(x,y,marker='.',markersize=2,linewidth=1,label=name); ax3.plot(x,y,z,marker='.',markersize=2,linewidth=1,label=name)
    ax.scatter([0],[0],marker='*',s=90,label='Sun'); ax.set(xlabel='X (AU)',ylabel='Y (AU)',title='Heliocentric XY samples'); ax.axis('equal'); ax.grid(True,alpha=.3); ax.legend(fontsize=7)
    ax3.set(xlabel='X (AU)',ylabel='Y (AU)',zlabel='Z (AU)',title='Heliocentric positions (3D)'); ax3.legend(fontsize=7); fig.tight_layout(); path.parent.mkdir(parents=True,exist_ok=True); fig.savefig(path,dpi=160); plt.close(fig); print(f'Saved plot: {path.resolve()}')

def main():
    parser=argparse.ArgumentParser(description='Solar System ephemerides, hypothetical Planet X model, and SPHEREx archive discovery.')
    parser.add_argument('--start',default=datetime.now(timezone.utc).date().isoformat(),help='Start UTC date/time, ISO format.')
    parser.add_argument('--end',default=None,help='End UTC date/time; defaults to --start.')
    parser.add_argument('--step',default='1 d',help="Sampling interval: '1 d', '12 h', '30 d', '1 y'.")
    parser.add_argument('--objects',default='Earth,Mars,Jupiter,Saturn,Uranus,Neptune,Pluto',help='Comma-separated Horizons names/IDs; e.g. Ceres, 1P/Halley, or spacecraft target if supported.')
    parser.add_argument('--planet-x',action='store_true',help='Add hypothetical Planet X Kepler propagation.')
    parser.add_argument('--px-a',type=float,default=500.0,help='Planet X semimajor axis AU (default 500).')
    parser.add_argument('--px-e',type=float,default=.3,help='Planet X eccentricity (default 0.3).')
    parser.add_argument('--px-i',type=float,default=20.0,help='Planet X inclination degrees (default 20).')
    parser.add_argument('--px-node',type=float,default=0.0,help='Assumed ascending node degrees (default 0).')
    parser.add_argument('--px-arg-peri',type=float,default=0.0,help='Assumed argument of perihelion degrees (default 0).')
    parser.add_argument('--px-M0',type=float,default=0.0,help='Assumed mean anomaly at epoch degrees (default 0).')
    parser.add_argument('--px-epoch',default='2026-01-01T00:00:00Z',help='Epoch for Planet X mean anomaly.')
    parser.add_argument('--px-mass-earth',type=float,default=6.0,help='Assumed Planet X mass in Earth masses (default 6).')
    parser.add_argument('--spherex-ra',type=float,default=None,help='Optional SPHEREx search RA in degrees.')
    parser.add_argument('--spherex-dec',type=float,default=None,help='Optional SPHEREx search declination in degrees.')
    parser.add_argument('--spherex-radius',type=float,default=.1,help='SPHEREx search radius degrees (default 0.1).')
    parser.add_argument('--outdir',default='space_object_results',help='Output directory.')
    parser.add_argument('--no-plot',action='store_true',help='Skip plot generation.')
    args=parser.parse_args()
    try:
        start=parse_datetime(args.start); end=parse_datetime(args.end) if args.end else start; jds,labels=make_epochs(start,end,parse_step(args.step)); outdir=Path(args.outdir); all_rows=[]
        for name in [x.strip() for x in args.objects.split(',') if x.strip()]:
            try: all_rows.extend(query_horizons(resolve_target(name),jds,name))
            except Exception as exc: print(f'WARNING: {exc}',file=sys.stderr)
        if args.planet_x:
            epoch_jd=float(Time(parse_datetime(args.px_epoch),scale='utc').jd)
            try: all_rows.extend(propagate_planet_x(jds,labels,args.px_a,args.px_e,args.px_i,args.px_node,args.px_arg_peri,args.px_M0,epoch_jd,args.px_mass_earth))
            except Exception as exc: print(f'WARNING: Planet X model failed: {exc}',file=sys.stderr)
        write_csv(outdir/'ephemerides.csv',all_rows)
        if args.spherex_ra is not None or args.spherex_dec is not None:
            if args.spherex_ra is None or args.spherex_dec is None: print('WARNING: Supply both --spherex-ra and --spherex-dec; skipping SPHEREx query.',file=sys.stderr)
            else:
                try:
                    srows=query_spherex(args.spherex_ra,args.spherex_dec,args.spherex_radius); write_csv(outdir/'spherex_archive_products.csv',srows)
                    print(f'SPHEREx archive discovery returned {len(srows)} row(s); this does not yet download or fit spectra.')
                except Exception as exc: print(f'WARNING: SPHEREx query failed: {exc}',file=sys.stderr)
        if all_rows and not args.no_plot: render_plot(all_rows,outdir/'ephemerides.png')
        print('\nFinished. Check the note column: Planet X values are model outputs with assumed parameters.')
        print(f'Output directory: {outdir.resolve()}')
        return 0 if all_rows else 1
    except Exception as exc:
        print(f'ERROR: {exc}',file=sys.stderr); return 2

if __name__=='__main__': raise SystemExit(main())

class PositionTrack:
    """Per-survey-pass position history (epoch number = list index) with velocity + forward prediction.
    Store HELIOCENTRIC ecliptic positions (AU); sky shift alone mixes motion with Earth parallax."""
    def __init__(self): self.epochs = []
    def add(self, jd, helio_ecl_xyz):
        self.epochs.append({'n': len(self.epochs), 'jd': float(jd), 'p': np.asarray(helio_ecl_xyz, float)})
        return self.epochs[-1]['n']
    def velocity(self):
        """AU/day from the last two epochs."""
        if len(self.epochs) < 2: raise ValueError('Need at least 2 epochs.')
        a, b = self.epochs[-2], self.epochs[-1]
        if b['jd'] <= a['jd']: raise ValueError('Epochs must be in increasing time order.')
        return (b['p'] - a['p']) / (b['jd'] - a['jd'])
    def predict(self, jd, earth_helio_ecl_at_jd):
        """Linear extrapolation; accurate for a few epochs only (use a Kepler fit beyond that)."""
        last = self.epochs[-1]; p = last['p'] + self.velocity() * (jd - last['jd'])
        return {'helio_xyz': p, **geocentric_sky_position(p, earth_helio_ecl_at_jd)}


# ---------------------------------------------------------------------------
# Planet X report: orbit size, mass, and position on a timeline
# ---------------------------------------------------------------------------
M_EARTH_IN_MSUN = 3.00348959632e-6      # Earth/Sun mass ratio
M_JUPITER_IN_EARTH = 317.828            # Jupiter mass in Earth masses
AU_KM = 149597870.7
V_CIRC_1AU_KMS = 29.7847                # circular speed at 1 AU
# Illustrative presets only: Planet X is hypothetical. Values are approximate, in the spirit of the
# Batygin & Brown (2016/2019) "Planet Nine" proposal; they are NOT a confirmed orbit.
PLANET_X_PRESETS = {
    'batygin-brown-like': dict(a=500.0, e=0.25, inc=20.0, node=90.0, arg_peri=150.0, M0_deg=180.0, mass_earth=5.0),
    'default-assumed':    dict(a=500.0, e=0.30, inc=20.0, node=0.0,  arg_peri=0.0,   M0_deg=0.0,   mass_earth=6.0),
}

def earth_helio_ecl_builtin(jd_utc):
    """Heliocentric ecliptic (J2000) Earth position in AU from astropy's built-in ephemeris (offline).
    Used when JPL Horizons is unavailable; agrees with Horizons to ~1e-5 AU or better for this purpose."""
    from astropy.coordinates import get_body_barycentric, SkyCoord, HeliocentricMeanEcliptic, ICRS
    t = Time(jd_utc, format='jd', scale='utc')
    r = get_body_barycentric('earth', t, ephemeris='builtin') - get_body_barycentric('sun', t, ephemeris='builtin')
    c = SkyCoord(ICRS(r)).transform_to(HeliocentricMeanEcliptic(equinox=Time('J2000')))
    return np.array(c.cartesian.xyz.to_value('AU'), float)

def planet_x_orbit_summary(a, e, inc, mass_earth):
    """Size/shape/mass facts that follow from the elements. Mass is an INPUT (an orbit alone cannot give it)."""
    if a <= 0 or not 0 <= e < 1 or mass_earth <= 0: raise ValueError('Require a>0, 0<=e<1, mass>0.')
    peri, aph = a*(1-e), a*(1+e); period_yr = a**1.5
    v = lambda r: V_CIRC_1AU_KMS*math.sqrt(2/r - 1/a)           # vis-viva, km/s
    msun = mass_earth*M_EARTH_IN_MSUN
    return {'semi_major_axis_au': a, 'eccentricity': e, 'inclination_deg': inc,
            'semi_minor_axis_au': a*math.sqrt(1-e*e), 'perihelion_au': peri, 'aphelion_au': aph,
            'period_years': period_yr, 'mean_motion_deg_per_year': 360.0/period_yr,
            'speed_perihelion_kms': v(peri), 'speed_aphelion_kms': v(aph),
            'mass_earth': mass_earth, 'mass_jupiter': mass_earth/M_JUPITER_IN_EARTH, 'mass_sun': msun,
            'hill_radius_perihelion_au': peri*(msun/3.0)**(1/3), 'hill_radius_aphelion_au': aph*(msun/3.0)**(1/3),
            'mass_note': 'Mass is an assumed input; the Kepler orbit here is Sun-only and does not depend on it.'}

def planet_x_orbit_path(a, e, inc, node, arg_peri, n=360):
    """Closed orbit outline (heliocentric ecliptic, AU) as a list of [x, y, z]."""
    rot = rotation_matrix(node, inc, arg_peri); out = []
    for k in range(n+1):
        E = 2*math.pi*k/n
        p = rot @ np.array([a*(math.cos(E)-e), a*math.sqrt(1-e*e)*math.sin(E), 0.0])
        out.append([float(p[0]), float(p[1]), float(p[2])])
    return out

def planet_x_report(start, end, step='30 d', a=500.0, e=0.3, inc=20.0, node=0.0, arg_peri=0.0, M0_deg=0.0,
                    epoch='2026-01-01T00:00:00Z', mass_earth=6.0, earth_fn=earth_helio_ecl_builtin):
    """Orbit size + mass + position of hypothetical Planet X on a timeline (offline, no printing).
    Returns {'summary', 'orbit_path', 'track', 'assumptions'}; track rows carry heliocentric position/speed
    and the geocentric RA/Dec as seen from Earth."""
    s_ = start if isinstance(start, datetime) else parse_datetime(start)
    e_ = end if isinstance(end, datetime) else parse_datetime(end)
    jds, labels = make_epochs(s_, e_, parse_step(step))
    epoch_jd = float(Time(epoch if isinstance(epoch, datetime) else parse_datetime(epoch), scale='utc').jd)
    rows = propagate_planet_x(jds, labels, a, e, inc, node, arg_peri, M0_deg, epoch_jd, mass_earth)
    track = []
    for r, jd in zip(rows, jds):
        g = geocentric_sky_position((r['x_au'], r['y_au'], r['z_au']), earth_fn(jd))
        track.append({'datetime_utc': r['datetime_utc'], 'jd': jd, 'x_au': r['x_au'], 'y_au': r['y_au'], 'z_au': r['z_au'],
                      'distance_au': r['distance_au'], 'speed_kms': r['speed_au_day']*AU_KM/86400.0, **g})
    return {'summary': planet_x_orbit_summary(a, e, inc, mass_earth), 'orbit_path': planet_x_orbit_path(a, e, inc, node, arg_peri),
            'track': track,
            'assumptions': {'a': a, 'e': e, 'inc': inc, 'node': node, 'arg_peri': arg_peri, 'M0_deg': M0_deg, 'epoch': str(epoch), 'mass_earth': mass_earth,
                            'note': 'HYPOTHETICAL. Elements are assumed, not measured. Sun-only two-body Kepler model; geometric positions (no light-time).'}}