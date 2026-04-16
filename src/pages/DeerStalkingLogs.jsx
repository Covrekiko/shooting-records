import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { MapPin, Clock, Navigation2 } from 'lucide-react';
import { DESIGN } from '@/lib/designConstants';

export default function DeerStalkingLogs() {
  const [outings, setOutings] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outings');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outingsData, markersData, harvestsData] = await Promise.all([
        base44.entities.DeerOuting.list('-created_date'),
        base44.entities.MapMarker.list('-created_at'),
        base44.entities.Harvest.list('-created_date'),
      ]);
      setOutings(outingsData || []);
      setMarkers(markersData || []);
      setHarvests(harvestsData || []);
    } catch (err) {
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (start, end) => {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    if (ms < 0) return null;
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const tabs = [
    { id: 'outings', label: 'Outings', count: outings.length },
    { id: 'markers', label: 'Points of Interest', count: markers.length },
    { id: 'harvests', label: 'Harvest Records', count: harvests.length },
  ];

  if (loading) {
    return (
      <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
      <Navigation />
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">

        {/* Header */}
        <div className="mb-4 hidden md:block">
          <h1 className={DESIGN.PAGE_HEADING}>Stalking Logs</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Field activity history</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-1.5 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-100 ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-primary text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Outings Tab */}
        {activeTab === 'outings' && (
          <div className="space-y-2.5">
            {outings.length === 0 ? (
              <EmptyState message="No outings recorded yet" />
            ) : (
              outings.map((outing) => {
                const duration = formatDuration(outing.start_time, outing.end_time);
                return (
                  <div key={outing.id} className={`${DESIGN.CARD} p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{outing.location_name || 'Unknown Location'}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDate(outing.start_time)} · {formatTime(outing.start_time)}
                        </p>
                      </div>
                      {duration && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 dark:bg-primary/15 px-2.5 py-1 rounded-lg ml-2 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {duration}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      {outing.gps_track?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Navigation2 className="w-3 h-3" />
                          {outing.gps_track.length} GPS points
                        </span>
                      )}
                    </div>

                    {outing.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{outing.notes}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Markers Tab */}
        {activeTab === 'markers' && (
          <div className="space-y-2.5">
            {markers.length === 0 ? (
              <EmptyState message="No points of interest recorded yet" />
            ) : (
              markers.map((marker) => (
                <div key={marker.id} className={`${DESIGN.CARD} p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                        {marker.marker_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDate(marker.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 ml-2">
                      <MapPin className="w-3 h-3" />
                      <span>{marker.latitude?.toFixed(3)}°, {marker.longitude?.toFixed(3)}°</span>
                    </div>
                  </div>

                  {marker.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{marker.notes}</p>
                  )}

                  {marker.photos?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {marker.photos.map((photo, idx) => (
                        <img key={idx} src={photo} alt="" className="w-full h-16 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Harvests Tab */}
        {activeTab === 'harvests' && (
          <div className="space-y-2.5">
            {harvests.length === 0 ? (
              <EmptyState message="No harvest records yet" />
            ) : (
              harvests.map((harvest) => (
                <div key={harvest.id} className={`${DESIGN.CARD} p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{harvest.species}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDate(harvest.harvest_date)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg capitalize ml-2">
                      {harvest.sex}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-2">
                    <MapPin className="w-3 h-3" />
                    <span>{harvest.latitude?.toFixed(4)}°, {harvest.longitude?.toFixed(4)}°</span>
                  </div>

                  {harvest.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{harvest.notes}</p>
                  )}

                  {harvest.photos?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {harvest.photos.map((photo, idx) => (
                        <img key={idx} src={photo} alt="" className="w-full h-16 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-10 text-center shadow-sm">
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}