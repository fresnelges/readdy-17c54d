import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';

interface Project {
  id: number;
  titre: string;
  status: number;
  datedebut: string;
  datedefin: string;
  clientid: number;
}

interface Client {
  id: number;
  nomclient: string;
}

const STATUS_LABEL: Record<number, string> = { 1: 'En cours', 2: 'Terminé', 3: 'Annulé', 4: 'En attente' };

const STATUS_COLORS: Record<number, string> = {
  1: 'var(--accent-500)',
  2: 'var(--secondary-500)',
  3: '#9ca3af',
  4: '#f59e0b',
};

interface StatsChartsProps {
  projects: Project[];
  clients: Client[];
}

export default function StatsCharts({ projects, clients }: StatsChartsProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 bg-background-50 border border-background-200/70 rounded-lg mb-6">
        <i className="ri-bar-chart-grouped-line text-3xl text-foreground-300 mb-2"></i>
        <p className="text-sm text-foreground-500">Créez des projets pour voir les statistiques</p>
      </div>
    );
  }

  // Projects by status
  const statusData = [1, 2, 3, 4].map((s) => ({
    name: STATUS_LABEL[s],
    value: projects.filter((p) => p.status === s).length,
  })).filter((d) => d.value > 0);

  // Projects by client (top 8)
  const clientCounts: Record<string, number> = {};
  projects.forEach((p) => {
    if (!p.clientid) return;
    const c = clients.find((cl) => cl.id === p.clientid);
    const key = c ? c.nomclient : `Client #${p.clientid}`;
    clientCounts[key] = (clientCounts[key] || 0) + 1;
  });
  const clientData = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Evolution over time (by month)
  const monthlyMap: Record<string, number> = {};
  projects.forEach((p) => {
    const d = new Date(p.datedebut);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const sortedMonths = Object.keys(monthlyMap).sort();
  if (sortedMonths.length > 12) {
    sortedMonths.splice(0, sortedMonths.length - 12);
  }
  const timelineData = sortedMonths.map((m) => {
    const [y, mo] = m.split('-');
    return {
      label: `${['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][Number(mo) - 1]} ${y}`,
      count: monthlyMap[m],
    };
  });

  // Cumulative line
  let cumulative = 0;
  const cumulData = timelineData.map((d) => {
    cumulative += d.count;
    return { ...d, cumul: cumulative };
  });

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie: par statut */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-1.5">
            <i className="ri-pie-chart-line text-accent-500"></i>Par statut
          </h4>
          {statusData.length === 0 ? (
            <p className="text-xs text-foreground-400 text-center py-8">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[Number(k)] === entry.name) as unknown as number] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid oklch(var(--background-200) / 0.7)', fontSize: '12px' }}
                  formatter={(value: number) => [`${value} projet${value > 1 ? 's' : ''}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map((d) => (
              <span key={d.name} className="text-xs text-foreground-500 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: STATUS_COLORS[Object.keys(STATUS_LABEL).find((k) => STATUS_LABEL[Number(k)] === d.name) as unknown as number] || '#9ca3af' }}></span>
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Bar: par client */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-1.5">
            <i className="ri-bar-chart-line text-secondary-500"></i>Par client
          </h4>
          {clientData.length === 0 ? (
            <p className="text-xs text-foreground-400 text-center py-8">Aucun projet lié à un client</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={clientData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--background-200) / 0.5)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid oklch(var(--background-200) / 0.7)', fontSize: '12px' }}
                  formatter={(value: number) => [`${value} projet${value > 1 ? 's' : ''}`, '']}
                />
                <Bar dataKey="count" fill="var(--secondary-500)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line: évolution */}
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-1.5">
            <i className="ri-line-chart-line text-primary-500"></i>Évolution
          </h4>
          {timelineData.length === 0 ? (
            <p className="text-xs text-foreground-400 text-center py-8">Pas assez de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cumulData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--background-200) / 0.5)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid oklch(var(--background-200) / 0.7)', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [`${value} projet${value > 1 ? 's' : ''}`, name === 'cumul' ? 'Cumul' : 'Nouveaux']}
                />
                <Line type="monotone" dataKey="cumul" stroke="var(--primary-500)" strokeWidth={2} dot={{ r: 3 }} name="Cumul" />
                <Line type="monotone" dataKey="count" stroke="var(--accent-500)" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="4 3" name="Nouveaux" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}