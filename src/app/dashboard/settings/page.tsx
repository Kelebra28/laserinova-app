import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { updateCostConfigurations } from "./actions";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UsersPanel } from "@/components/settings/UsersPanel";
import { Save, Settings2, User, Users, SlidersHorizontal, Database, HardDrive, Mail } from "lucide-react";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { EmailConfigForm } from "@/components/settings/EmailConfigForm";
import CalculationAudit from "@/components/quotes/CalculationAudit";
import fs from "fs";
import path from "path";

async function getUploadsSizeMB() {
  const uploadsPath = path.join(process.cwd(), "public", "uploads");
  let totalSize = 0;
  async function calculateSize(dirPath: string) {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await calculateSize(fullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (e) {
      // Ignorar si no existe
    }
  }
  await calculateSize(uploadsPath);
  return (totalSize / (1024 * 1024)).toFixed(2);
}

async function getDbSizeMB() {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT sum(data_length + index_length) / 1024 / 1024 AS "size"
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE();
    `);
    if (result && result[0] && result[0].size) {
      return Number(result[0].size).toFixed(2);
    }
    return "0.00";
  } catch (e) {
    return "N/A";
  }
}

const DEFAULT_CONFIGS = [
  { key: "costo_minuto_mayoreo",      name: "Costo por minuto (Mayoreo)",          default: 8.5,    unit: "$"    },
  { key: "costo_minuto_menudeo",      name: "Costo por minuto (Menudeo)",          default: 10,     unit: "$"    },
  { key: "precio_tubo",               name: "Precio del Tubo/Láser",               default: 250000, unit: "$"    },
  { key: "vida_util_tubo",            name: "Vida útil Tubo (Horas)",              default: 6000,   unit: "hrs"  },
  { key: "factor_miedo",              name: "Factor de Miedo",                     default: 2,      unit: "x"    },
  { key: "factor_produccion_default", name: "Factor de Producción (Gral)",         default: 3,      unit: "x"    },
  { key: "porcentaje_iva",            name: "Porcentaje de IVA",                   default: 16,     unit: "%"    },
  { key: "factor_guarda_default",     name: "Factor de Guarda Global (Merma)",     default: 1.5,    unit: "x"    },
  { key: "margen_default",            name: "Margen de Ganancia Global",           default: 50,     unit: "%"    },
  { key: "gastos_fijos_mensuales",    name: "Gastos Fijos Mensuales (Overhead)",   default: 3910,   unit: "$"    },
  { key: "dias_laborables_mes",       name: "Días Laborables al Mes",              default: 22,     unit: "días" },
  { key: "horas_maquina_dia",         name: "Horas Máquina al Día",               default: 8,      unit: "horas"},
  { key: "porcentaje_transporte_material", name: "Transporte de Material (Inflado)", default: 20, unit: "%" },
  { key: "porcentaje_merma_corte",         name: "Merma de Corte (Desperdicio)",     default: 20, unit: "%" },
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any;
  if (!currentUser) redirect("/login");

  const isAdmin = currentUser.role === "ADMIN";
  if (!isAdmin) redirect("/dashboard");

  const [savedConfigs, users, me, dbSize, uploadsSize] = await Promise.all([
    prisma.costConfiguration.findMany(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        emailIncomingServer: true,
        emailOutgoingServer: true,
      },
    }),
    getDbSizeMB(),
    getUploadsSizeMB(),
  ]);

  const configMap = new Map(savedConfigs.map((c) => [c.key, c.value]));

  const costsContent = (
    <div key="costs" className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="p-2 rounded-xl bg-amber-50">
            <SlidersHorizontal className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">Costos Operativos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Valores base para el cálculo automático de cotizaciones</p>
          </div>
        </div>

        <form action={updateCostConfigurations} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {DEFAULT_CONFIGS.map((config) => {
              const value = configMap.has(config.key) ? configMap.get(config.key) : config.default;
              return (
                <div key={config.key} className="space-y-2">
                  <label
                    htmlFor={config.key}
                    className="block text-[11px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    {config.name}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      name={config.key}
                      id={config.key}
                      defaultValue={value}
                      className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 pointer-events-none uppercase">
                      {config.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Save className="w-4 h-4" />
              Guardar configuración
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-1">
        <CalculationAudit concepts={[]} margin={configMap.get("margen_default") ?? 50} />
      </div>
    </div>
  );

  const usersContent = (
    <div key="users" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="p-2 rounded-xl bg-violet-50">
          <Users className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">Equipo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Administración de accesos y roles del sistema</p>
        </div>
      </div>
      <div className="p-6">
        <UsersPanel users={users} currentUserId={currentUser.id} />
      </div>
    </div>
  );

  const dbLimitMB = 3000;
  const filesLimitMB = 204800; // 200 GB reales del plan Hostinger
  const dbPercent = Math.min((Number(dbSize) / dbLimitMB) * 100, 100);
  const filesPercent = Math.min((Number(uploadsSize) / filesLimitMB) * 100, 100);

  const getDbColor = (p: number) => p > 90 ? '#ef4444' : p > 75 ? '#f59e0b' : '#6366f1';
  const getFilesColor = (p: number) => p > 90 ? '#ef4444' : p > 75 ? '#f59e0b' : '#10b981';

  const dbColor = getDbColor(dbPercent);
  const filesColor = getFilesColor(filesPercent);

  const systemContent = (
    <div key="system" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">Almacenamiento (Hostinger)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monitor de espacio ocupado por la BD y archivos</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Gráfico BD */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            <div 
              className="absolute inset-0 rounded-full transition-all duration-1000 ease-out" 
              style={{ background: `conic-gradient(${dbColor} ${dbPercent}%, #f3f4f6 0)` }} 
            />
            <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_10px_-3px_rgba(0,0,0,0.05)]">
              <Database className="h-6 w-6 mb-1" style={{ color: dbColor }} />
              <span className="text-xl font-black text-gray-900 leading-none">{dbPercent.toFixed(1)}%</span>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Base de Datos</h3>
          <p className="text-2xl font-black text-gray-900 flex items-baseline justify-center gap-1">
            {dbSize} <span className="text-sm font-bold text-gray-400">MB</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            Límite: ~3 GB (MySQL)
          </p>
        </div>

        {/* Gráfico Archivos */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] relative overflow-hidden group hover:border-emerald-100 transition-colors">
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            <div 
              className="absolute inset-0 rounded-full transition-all duration-1000 ease-out" 
              style={{ background: `conic-gradient(${filesColor} ${filesPercent}%, #f3f4f6 0)` }} 
            />
            <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_10px_-3px_rgba(0,0,0,0.05)]">
              <HardDrive className="h-6 w-6 mb-1" style={{ color: filesColor }} />
              <span className="text-xl font-black text-gray-900 leading-none">{filesPercent.toFixed(1)}%</span>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Archivos e Imágenes</h3>
          <p className="text-2xl font-black text-gray-900 flex items-baseline justify-center gap-1">
            {uploadsSize} <span className="text-sm font-bold text-gray-400">MB</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            Límite: 200 GB (Disco)
          </p>
        </div>

      </div>
    </div>
  );

  const profileContent = (
    <div key="profile" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="p-2 rounded-xl bg-red-50">
          <User className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">Mi Perfil</h2>
          <p className="text-xs text-gray-400 mt-0.5 font-semibold">Tu información personal de acceso al CRM</p>
        </div>
      </div>
      <div className="p-6">
        {me ? (
          <ProfileForm user={me} />
        ) : (
          <p className="text-sm text-gray-400">No se pudo cargar el perfil.</p>
        )}
      </div>
    </div>
  );

  const emailContent = (
    <div key="email" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="p-2 rounded-xl bg-teal-50">
          <Mail className="w-5 h-5 text-teal-650" />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-800 uppercase tracking-widest">Correo Hostinger</h2>
          <p className="text-xs text-gray-400 mt-0.5 font-semibold">Tu cuenta personal SMTP/IMAP para enviar y recibir correos de cotizaciones</p>
        </div>
      </div>
      <div className="p-6">
        {me ? (
          <EmailConfigForm 
            incomingServer={me.emailIncomingServer} 
            outgoingServer={me.emailOutgoingServer} 
          />
        ) : (
          <p className="text-sm text-gray-400">No se pudo cargar el correo.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-md">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Configuración</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Sistema, perfiles de usuario, correos y gastos operativos
          </p>
        </div>
      </div>

      <div className="bg-transparent">
        <SettingsTabs 
          profileContent={profileContent}
          usersContent={usersContent} 
          emailContent={emailContent}
          systemContent={systemContent} 
          costsContent={costsContent} 
        />
      </div>
    </div>
  );
}
