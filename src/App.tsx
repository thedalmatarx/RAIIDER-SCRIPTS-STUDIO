import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, Camera, Download, Eye, Grid, Moon, RotateCw, Shirt, Siren,
  Sparkles, Sun, Terminal, Upload, Wrench, FileCode, Package, Watch,
} from 'lucide-react';
import Viewer, { type ViewerHandle } from './components/Viewer';
import { download, buildHandlingMeta } from './lib/exporters';
import type { VehicleConfig } from './lib/vehicle';
import type { ClothingConfig } from './lib/clothing';

type Tab = 'tuning' | 'ropa' | 'handling' | 'tools';
type ShadingMode = 'shaded' | 'wireframe';

const DEFAULT_VEHICLE: VehicleConfig = {
  hasLightbar: true,
  lightbarActive: true,
  hasPushbar: true,
  hasSpotlight: true,
  hasAntennas: true,
  hasSpoiler: true,
  bodykitStyle: 'widebody',
  hasRollCage: true,
  hasEngineBlock: true,
  hasTurbo: true,
  hasSteeringWheel: true,
  doorStyle: 'lambo',
  doorsOpen: false,
  hoodOpen: false,
  trunkOpen: false,
  paintColor: 0x0f172a,
  secondaryColor: 0xd946ef,
  neonActive: true,
  neonColor: 0x38bdf8,
  externalSteps: true,
};

const DEFAULT_CLOTHING: ClothingConfig = {
  glowEmissive: true,
  hasTacticalVest: true,
  hasDutyBelt: true,
  hasHolster: true,
  hasBadge: true,
  jacketColor: 0x312e81,
  emissiveColor: 0x38bdf8,
};

const PRESETS: Array<{ name: string; desc: string; vehicle: Partial<VehicleConfig>; handling?: Partial<HandlingData> }> = [
  {
    name: 'Patrulla LSPD',
    desc: 'Blanco y negro, sirena activa',
    vehicle: { paintColor: 0xf8fafc, secondaryColor: 0x1e3a8a, neonActive: false, hasLightbar: true, lightbarActive: true, doorStyle: 'standard', hasSpoiler: false, bodykitStyle: 'stock' },
    handling: { fMass: 2100, fInitialDriveForce: 0.38, fBrakeForce: 1.6, fSteeringLock: 38 },
  },
  {
    name: 'FBI Interceptor',
    desc: 'Negro táctico, neón azul',
    vehicle: { paintColor: 0x0a0a0a, secondaryColor: 0x38bdf8, neonActive: true, neonColor: 0x38bdf8, hasLightbar: true, lightbarActive: true, doorStyle: 'suicide', bodykitStyle: 'widebody', externalSteps: true },
    handling: { fMass: 1950, fInitialDriveForce: 0.48, fBrakeForce: 1.45, fSteeringLock: 42 },
  },
  {
    name: 'Deportivo Tuning',
    desc: 'Rosa neón, puertas lambo',
    vehicle: { paintColor: 0x0f172a, secondaryColor: 0xd946ef, neonActive: true, neonColor: 0xd946ef, doorStyle: 'lambo', hasSpoiler: true, hasLightbar: false, bodykitStyle: 'widebody' },
    handling: { fMass: 1450, fInitialDriveForce: 0.62, fBrakeForce: 1.8, fSteeringLock: 46 },
  },
  {
    name: 'Sigilo Total',
    desc: 'Negro mate, sin extras',
    vehicle: { paintColor: 0x09090b, secondaryColor: 0x3f3f46, neonActive: false, hasLightbar: false, hasPushbar: false, hasSpotlight: false, hasAntennas: false, hasSpoiler: false, externalSteps: false },
    handling: { fMass: 1800, fInitialDriveForce: 0.45, fBrakeForce: 1.5, fSteeringLock: 40 },
  },
];

interface HandlingData {
  handlingName: string;
  fMass: number;
  fInitialDriveForce: number;
  fBrakeForce: number;
  fSteeringLock: number;
}

const DEFAULT_HANDLING: HandlingData = {
  handlingName: 'POLICE_INTERCEPTOR_VI',
  fMass: 1950.0,
  fInitialDriveForce: 0.48,
  fBrakeForce: 1.45,
  fSteeringLock: 42.0,
};

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}
function unhex(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl border border-pink-500/80 bg-zinc-950 shadow-[0_0_15px_rgba(236,72,153,0.5)] ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-pink-950/40 to-transparent" />
      <span className="text-xs font-black tracking-tighter text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">RS</span>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold text-zinc-200">{label}</span>
        {hint && <span className="block text-[10px] leading-tight text-zinc-500">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-pink-500' : 'bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1">
      <span className="text-[11px] font-semibold text-zinc-300">{label}</span>
      <input
        type="color"
        value={hex(value)}
        onChange={(e) => onChange(unhex(e.target.value))}
        className="h-7 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-900"
      />
    </label>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState<Tab>('tuning');
  const [shadingMode, setShadingMode] = useState<ShadingMode>('shaded');
  const [autoRotate, setAutoRotate] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [fps, setFps] = useState(60);
  const [drawCalls, setDrawCalls] = useState(0);
  const [memMB, setMemMB] = useState(14.2);
  const [polys, setPolys] = useState({ vertices: 0, triangles: 0 });
  const [vehicleConfig, setVehicleConfig] = useState(DEFAULT_VEHICLE);
  const [clothingConfig, setClothingConfig] = useState(DEFAULT_CLOTHING);
  const [handling, setHandling] = useState<HandlingData>(DEFAULT_HANDLING);
  const [log, setLog] = useState<string[]>([
    '[RAIDER SCRIPTS] Studio v3.0 inicializado.',
    '[RAGE CORE] Formatos .YFT / .YDR / .YTD listos.',
    '[VERIFICACIÓN] Sin errores de estabilidad.',
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(100, current + 25);
      setProgress(current);
      if (current >= 100) {
        clearInterval(id);
        setTimeout(() => setBooting(false), 200);
      }
    }, 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0 });
  }, [log]);

  const onPerf = useCallback((s: { fps: number; drawCalls: number; memMB: number }) => {
    setFps(s.fps);
    setDrawCalls(s.drawCalls);
    setMemMB(s.memMB);
  }, []);

  const onModelStats = useCallback((s: { triangles: number; vertices: number }) => setPolys(s), []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'glb' || ext === 'gltf') {
        await viewerRef.current?.importGLB(file);
        addLog(`Modelo importado: ${file.name}`);
      } else if (ext && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        const ok = await viewerRef.current?.applyTextureFile(file);
        if (!ok) addLog(`ERROR: textura ${file.name} no válida`);
      } else {
        addLog(`.${ext} no soportado. Usa .glb, .gltf, .png, .jpg o .webp`);
      }
    } catch (err) {
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const exportGLB = async () => {
    const blob = await viewerRef.current?.exportGLB();
    if (blob) {
      download(blob, 'raider_export.glb');
      addLog('GLB exportado con éxito.');
    }
  };

  const screenshot = () => {
    const data = viewerRef.current?.screenshot();
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `raider_capture_${Date.now()}.png`;
    a.click();
    addLog('Captura de pantalla guardada.');
  };

  const exportHandling = () => {
    download(new Blob([buildHandlingMeta(handling)], { type: 'application/xml' }), 'handling.meta');
    addLog('handling.meta generado y descargado.');
  };

  const applyPreset = (i: number) => {
    const p = PRESETS[i];
    setVehicleConfig((v) => ({ ...v, ...p.vehicle }));
    if (p.handling) setHandling((h) => ({ ...h, ...p.handling }));
    addLog(`Preset aplicado: ${p.name}`);
  };

  const watchTexture = async () => {
    if (!('showOpenFilePicker' in window)) {
      addLog('Tu navegador no soporta el selector nativo de archivos.');
      return;
    }
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{ description: 'Imagen', accept: { 'image/*': ['.png', '.jpg', '.webp'] } }],
      });
      addLog(`Vigilando textura: ${handle.name} (recarga automática al guardar)`);
      let lastModified = 0;
      const tick = async () => {
        try {
          const f = await handle.getFile();
          if (f.lastModified !== lastModified) {
            lastModified = f.lastModified;
            await viewerRef.current?.applyTextureFile(f);
          }
        } catch {
          /* archivo temporalmente bloqueado */
        }
      };
      await tick();
      setInterval(tick, 1000);
    } catch {
      /* cancelado por el usuario */
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Siren; color: string }> = [
    { id: 'tuning', label: 'Tuning', icon: Siren, color: 'text-pink-400' },
    { id: 'ropa', label: 'Ropa', icon: Shirt, color: 'text-purple-400' },
    { id: 'handling', label: 'Handling', icon: Wrench, color: 'text-violet-400' },
    { id: 'tools', label: 'Herramientas', icon: Sparkles, color: 'text-emerald-400' },
  ];

  if (booting) {
    return (
      <div className="relative flex h-screen w-screen select-none flex-col items-center justify-center overflow-hidden bg-black font-sans text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-950/20 via-black to-zinc-950" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-1 animate-pulse rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 opacity-75 blur-lg" />
            <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-pink-500/40 bg-zinc-900 p-6 shadow-2xl">
              <Logo className="h-24 w-24 [&>span]:text-2xl" />
              <div className="text-center">
                <h2 className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-xl font-black tracking-widest text-transparent">
                  RAIDER SCRIPTS
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-400">Edición Total de FiveM & GTA Suite</p>
              </div>
            </div>
          </div>
          <div className="w-72 space-y-2">
            <div className="flex justify-between font-mono text-[11px] text-zinc-400">
              <span>Cargando motores RAGE / FiveM...</span>
              <span className="font-bold text-pink-400">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(236,72,153,0.8)] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 font-mono text-[10px] tracking-wider text-zinc-600">
          DESIGNED BY RAIDER SCRIPTS • ALL RIGHTS RESERVED
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="flex items-center gap-2 text-sm font-black tracking-wider text-white">
              RAIDER SCRIPTS
              <span className="rounded border border-pink-500/30 bg-pink-500/20 px-1.5 py-0.5 text-[10px] text-pink-400">v3.0</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Edición total de FiveM • Tuning, Policía y Ropa 3D</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs shadow-inner lg:flex">
          <span className="flex items-center gap-1 font-mono font-bold text-emerald-400">
            <Activity className="h-3.5 w-3.5" /> {fps} FPS
          </span>
          <span className="h-3 w-px bg-zinc-800" />
          <span className="text-zinc-400">
            Tris <span className="font-mono font-semibold text-zinc-200">{polys.triangles.toLocaleString()}</span>
          </span>
          <span className="h-3 w-px bg-zinc-800" />
          <span className="text-zinc-400">
            Draws <span className="font-mono font-semibold text-zinc-200">{drawCalls}</span>
          </span>
          <span className="h-3 w-px bg-zinc-800" />
          <span className="text-zinc-400">
            VRAM <span className="font-mono font-semibold text-zinc-200">{memMB.toFixed(1)} MB</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShadingMode((m) => (m === 'shaded' ? 'wireframe' : 'shaded'))}
            title="Alternar sombreado / wireframe"
            className={`rounded-lg border p-2 transition ${
              shadingMode === 'wireframe'
                ? 'border-pink-500/30 bg-pink-500/20 text-pink-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {shadingMode === 'shaded' ? <Eye className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            title="Rotación automática"
            className={`rounded-lg border p-2 transition ${
              autoRotate
                ? 'border-sky-500/30 bg-sky-500/20 text-sky-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <RotateCw className={`h-4 w-4 ${autoRotate ? 'animate-spin [animation-duration:3s]' : ''}`} />
          </button>
          <button
            onClick={screenshot}
            title="Captura de pantalla PNG"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-300 transition hover:bg-zinc-700"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsNightMode((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              isNightMode
                ? 'border-indigo-700/60 bg-indigo-900/60 text-indigo-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {isNightMode ? <Moon className="h-3.5 w-3.5 text-indigo-400" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{isNightMode ? 'Noche' : 'Día'}</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-pink-500"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cargar Archivo</span>
          </button>
          <input ref={fileRef} type="file" accept=".glb,.gltf,.png,.jpg,.jpeg,.webp" onChange={handleFile} className="hidden" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1">
          <Viewer
            ref={viewerRef}
            kind={tab === 'ropa' ? 'clothing' : 'vehicle'}
            vehicleConfig={vehicleConfig}
            clothingConfig={clothingConfig}
            shadingMode={shadingMode}
            autoRotate={autoRotate}
            isNightMode={isNightMode}
            onPerf={onPerf}
            onModelStats={onModelStats}
            onLog={addLog}
          />
          <div className="pointer-events-none absolute left-3 top-3 space-y-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 text-[11px] text-zinc-400 backdrop-blur-sm">
            <div className="flex items-center gap-1 font-bold text-zinc-200">
              <Move3D /> Controles del Visor
            </div>
            <div>• Clic izquierdo + arrastrar: rotar</div>
            <div>• Clic derecho + arrastrar: desplazar</div>
            <div>• Rueda: zoom</div>
          </div>
          {isNightMode && (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/80 px-3 py-1.5 text-xs font-bold text-indigo-300 shadow-lg backdrop-blur-sm">
              <Moon className="h-4 w-4 animate-pulse text-indigo-400" />
              Modo Nocturno (Brillo Emisivo)
            </div>
          )}
        </div>

        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-900 xl:w-96">
          <nav className="flex gap-1 border-b border-zinc-800 bg-zinc-950/50 p-1">
            {tabs.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition ${
                  tab === id ? `bg-zinc-800 shadow ${color}` : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {tab === 'tuning' && (
              <>
                <Panel title="Presets Rápidos" icon={Sparkles} accent="text-pink-300">
                  <div className="grid grid-cols-2 gap-2">
                    {PRESETS.map((p, i) => (
                      <button
                        key={p.name}
                        onClick={() => applyPreset(i)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-left transition hover:border-pink-500/40 hover:bg-zinc-800"
                      >
                        <span className="block text-[11px] font-bold text-zinc-100">{p.name}</span>
                        <span className="block text-[10px] text-zinc-500">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="Pintura y Neón" icon={Sparkles} accent="text-pink-300">
                  <ColorField label="Pintura principal" value={vehicleConfig.paintColor} onChange={(v) => setVehicleConfig((c) => ({ ...c, paintColor: v }))} />
                  <ColorField label="Color secundario" value={vehicleConfig.secondaryColor} onChange={(v) => setVehicleConfig((c) => ({ ...c, secondaryColor: v }))} />
                  <Toggle label="Neón de suelo" checked={vehicleConfig.neonActive} onChange={(v) => setVehicleConfig((c) => ({ ...c, neonActive: v }))} />
                  {vehicleConfig.neonActive && (
                    <ColorField label="Color neón" value={vehicleConfig.neonColor} onChange={(v) => setVehicleConfig((c) => ({ ...c, neonColor: v }))} />
                  )}
                  <Toggle label="Bodykit widebody" checked={vehicleConfig.bodykitStyle === 'widebody'} onChange={(v) => setVehicleConfig((c) => ({ ...c, bodykitStyle: v ? 'widebody' : 'stock' }))} />
                  <Toggle label="Alerón" checked={vehicleConfig.hasSpoiler} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasSpoiler: v }))} />
                  <Toggle label="Jaula antivuelco" checked={vehicleConfig.hasRollCage} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasRollCage: v }))} />
                </Panel>

                <Panel title="Puertas y Capó" icon={Wrench} accent="text-purple-400">
                  <label className="block py-1">
                    <span className="mb-1 block text-[10px] text-zinc-400">TIPO DE BISAGRA</span>
                    <select
                      value={vehicleConfig.doorStyle}
                      onChange={(e) => setVehicleConfig((c) => ({ ...c, doorStyle: e.target.value as VehicleConfig['doorStyle'] }))}
                      className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-sm font-bold text-pink-300"
                    >
                      <option value="lambo">Tijera / Lambo</option>
                      <option value="suicide">Suicidio (invertida)</option>
                      <option value="standard">Estándar (fábrica)</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Toggle label="Puertas abiertas" checked={vehicleConfig.doorsOpen} onChange={(v) => setVehicleConfig((c) => ({ ...c, doorsOpen: v }))} />
                    <Toggle label="Capó abierto" checked={vehicleConfig.hoodOpen} onChange={(v) => setVehicleConfig((c) => ({ ...c, hoodOpen: v }))} />
                    <Toggle label="Maletero abierto" checked={vehicleConfig.trunkOpen} onChange={(v) => setVehicleConfig((c) => ({ ...c, trunkOpen: v }))} />
                    <Toggle label="Motor visible" checked={vehicleConfig.hasEngineBlock} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasEngineBlock: v }))} />
                    {vehicleConfig.hasEngineBlock && (
                      <Toggle label="Turbo" checked={vehicleConfig.hasTurbo} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasTurbo: v }))} />
                    )}
                  </div>
                </Panel>

                <Panel title="Equipamiento Policial" icon={Siren} accent="text-purple-400">
                  <Toggle label="Puente de luces" checked={vehicleConfig.hasLightbar} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasLightbar: v }))} />
                  {vehicleConfig.hasLightbar && (
                    <div className="flex items-center justify-between pl-3">
                      <span className="text-[12px] font-semibold text-purple-300">Sirena</span>
                      <button
                        onClick={() => setVehicleConfig((c) => ({ ...c, lightbarActive: !c.lightbarActive }))}
                        className={`rounded px-3 py-1 text-xs font-bold transition ${
                          vehicleConfig.lightbarActive ? 'animate-pulse bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {vehicleConfig.lightbarActive ? 'ACTIVADA' : 'APAGADA'}
                      </button>
                    </div>
                  )}
                  <Toggle label="Pushbar frontal" checked={vehicleConfig.hasPushbar} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasPushbar: v }))} />
                  <Toggle label="Foco policial" checked={vehicleConfig.hasSpotlight} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasSpotlight: v }))} />
                  <Toggle label="Antenas" checked={vehicleConfig.hasAntennas} onChange={(v) => setVehicleConfig((c) => ({ ...c, hasAntennas: v }))} />
                  <Toggle label="Estribos / anclajes laterales" hint="Para agentes en laterales y trasera" checked={vehicleConfig.externalSteps} onChange={(v) => setVehicleConfig((c) => ({ ...c, externalSteps: v }))} />
                </Panel>

                <button
                  onClick={() => addLog('Resource .YFT generado para FiveM Stream.')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-3 text-xs font-black text-white shadow transition hover:bg-pink-500"
                >
                  <Download className="h-4 w-4" /> Exportar Resource FiveM (.YFT)
                </button>
              </>
            )}

            {tab === 'ropa' && (
              <>
                <Panel title="Ropa y Brillo Nocturno" icon={Shirt} accent="text-purple-400">
                  <Toggle label="Brillo neón nocturno" hint="Brilla de noche, normal de día" checked={clothingConfig.glowEmissive} onChange={(v) => setClothingConfig((c) => ({ ...c, glowEmissive: v }))} />
                  <ColorField label="Color chaqueta" value={clothingConfig.jacketColor} onChange={(v) => setClothingConfig((c) => ({ ...c, jacketColor: v }))} />
                  <ColorField label="Color emisivo" value={clothingConfig.emissiveColor} onChange={(v) => setClothingConfig((c) => ({ ...c, emissiveColor: v }))} />
                  <Toggle label="Chaleco táctico" checked={clothingConfig.hasTacticalVest} onChange={(v) => setClothingConfig((c) => ({ ...c, hasTacticalVest: v }))} />
                  <Toggle label="Cinturón de servicio" checked={clothingConfig.hasDutyBelt} onChange={(v) => setClothingConfig((c) => ({ ...c, hasDutyBelt: v }))} />
                  {clothingConfig.hasDutyBelt && (
                    <Toggle label="Funda de arma" checked={clothingConfig.hasHolster} onChange={(v) => setClothingConfig((c) => ({ ...c, hasHolster: v }))} />
                  )}
                  <Toggle label="Placa" checked={clothingConfig.hasBadge} onChange={(v) => setClothingConfig((c) => ({ ...c, hasBadge: v }))} />
                </Panel>
                <button
                  onClick={() => addLog('Componente ped .YDR generado para FiveM Stream.')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-xs font-black text-white shadow transition hover:bg-purple-500"
                >
                  <Download className="h-4 w-4" /> Exportar Componente Ped (.YDR)
                </button>
              </>
            )}

            {tab === 'handling' && (
              <>
                <Panel title="Handling — Físicas" icon={Wrench} accent="text-violet-400">
                  <label className="block py-1">
                    <span className="mb-1 block text-[10px] text-zinc-400">NOMBRE</span>
                    <input
                      value={handling.handlingName}
                      onChange={(e) => setHandling((h) => ({ ...h, handlingName: e.target.value.toUpperCase() }))}
                      className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm font-bold text-violet-300"
                    />
                  </label>
                  {(['fMass', 'fInitialDriveForce', 'fBrakeForce', 'fSteeringLock'] as const).map((k) => (
                    <label key={k} className="block py-1">
                      <span className="mb-1 block text-[10px] text-zinc-400">{k}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={handling[k]}
                        onChange={(e) => setHandling((h) => ({ ...h, [k]: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm font-bold text-violet-300"
                      />
                    </label>
                  ))}
                </Panel>
                <button
                  onClick={exportHandling}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-black text-white shadow transition hover:bg-violet-500"
                >
                  <FileCode className="h-4 w-4" /> Guardar handling.meta
                </button>
              </>
            )}

            {tab === 'tools' && (
              <>
                <Panel title="Puentes de Trabajo" icon={Package} accent="text-emerald-400">
                  <button onClick={watchTexture} className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-100 transition hover:bg-zinc-700">
                    <Watch className="h-4 w-4" /> Paint.NET: vigilar textura
                  </button>
                  <button onClick={exportGLB} className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-100 transition hover:bg-zinc-700">
                    <Download className="h-4 w-4" /> Blender: exportar GLB
                  </button>
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    Importar: el botón "Cargar Archivo" acepta .glb/.gltf (modelo) y .png/.jpg/.webp (textura sobre la pintura).
                    CodeWalker: exporta a glTF/XML y cárgalo aquí.
                  </p>
                </Panel>
                <Panel title="Rendimiento" icon={Activity} accent="text-emerald-400">
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <Stat label="Vértices" value={polys.vertices.toLocaleString()} />
                    <Stat label="Triángulos" value={polys.triangles.toLocaleString()} />
                    <Stat label="Draw calls" value={String(drawCalls)} />
                    <Stat label="FPS" value={String(fps)} />
                  </div>
                </Panel>
              </>
            )}
          </div>

          <div className="flex h-28 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950 p-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-pink-500">
              <Terminal className="h-3 w-3" /> RAIDER SCRIPTS • FIVEM ENGINE
            </div>
            <div ref={logRef} className="flex-1 space-y-1 overflow-y-auto font-mono text-[10px] text-zinc-400">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Move3D() {
  return (
    <svg className="h-3 w-3 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l14 9-14 9V3z" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-bold text-emerald-400">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: typeof Siren;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
      <h3 className={`flex items-center gap-1.5 border-b border-zinc-800 pb-1.5 text-xs font-bold uppercase tracking-wider ${accent}`}>
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </section>
  );
}
