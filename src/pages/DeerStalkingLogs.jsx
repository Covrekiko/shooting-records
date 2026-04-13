import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { MapPin, Calendar, FileText } from 'lucide-react';

export default function DeerStalkingLogs() {
  const [outings, setOutings] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outings');

  useEffect(() => {
    loadData();
  }, []);

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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const ms = new Date(end) - new Date(start);
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Deer Stalking Logs</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-border">
          {[
            { id: 'outings', label: `Outings (${outings.length})` },
            { id: 'markers', label: `Points of Interest (${markers.length})` },
            { id: 'harvests', label: `Harvest Records (${harvests.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Outings Tab */}
        {activeTab === 'outings' && (
          <div className="space-y-4">
            {outings.length === 0 ? (
              <p className="text-muted-foreground">No outings recorded yet.</p>
            ) : (
              outings.map((outing) => (
                <div key={outing.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{outing.location_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(outing.start_time)}
                      </p>
                    </div>
                    <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {formatDuration(outing.start_time, outing.end_time)}
                    </span>
                  </div>

                  {outing.gps_track && (
                    <p className="text-sm text-muted-foreground mb-2">
                      GPS Points: {outing.gps_track.length}
                    </p>
                  )}

                  {outing.notes && (
                    <p className="text-sm text-foreground mb-2">{outing.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Markers Tab */}
        {activeTab === 'markers' && (
          <div className="space-y-4">
            {markers.length === 0 ? (
              <p className="text-muted-foreground">No points of interest recorded yet.</p>
            ) : (
              markers.map((marker) => (
                <div key={marker.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold capitalize">
                        {marker.marker_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(marker.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {marker.latitude.toFixed(4)}°
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {marker.longitude.toFixed(4)}°
                      </p>
                    </div>
                  </div>

                  {marker.notes && (
                    <p className="text-sm text-foreground mb-2">{marker.notes}</p>
                  )}

                  {marker.photos && marker.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {marker.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Marker photo ${idx}`}
                          className="w-full h-20 object-cover rounded"
                        />
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
          <div className="space-y-4">
            {harvests.length === 0 ? (
              <p className="text-muted-foreground">No harvest records yet.</p>
            ) : (
              harvests.map((harvest) => (
                <div key={harvest.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{harvest.species}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(harvest.harvest_date)}
                      </p>
                    </div>
                    <span className="text-sm font-medium bg-red-100 text-red-700 px-3 py-1 rounded-full capitalize">
                      {harvest.sex}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground mb-2">
                    Location: {harvest.latitude.toFixed(4)}°, {harvest.longitude.toFixed(4)}°
                  </div>

                  {harvest.notes && (
                    <p className="text-sm text-foreground mb-2">{harvest.notes}</p>
                  )}

                  {harvest.photos && harvest.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {harvest.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Harvest photo ${idx}`}
                          className="w-full h-20 object-cover rounded"
                        />
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