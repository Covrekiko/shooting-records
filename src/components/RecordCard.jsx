import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Edit, Eye, FileText, Image, Loader, Map, Trash2 } from 'lucide-react';
import { isPendingOfflineRecord } from '@/lib/offlineFieldSessions';
import { resolveClayClubName, getClayScoreSummary } from '@/lib/claySessionUtils';

const typeLabel = {
  target: 'Target Shooting',
  clay: 'Clay Shooting',
  deer: 'Deer Management',
};

function getRecordType(record) {
  if (record.recordType) return record.recordType;
  if (record.category === 'target_shooting') return 'target';
  if (record.category === 'clay_shooting') return 'clay';
  if (record.category === 'deer_management') return 'deer';
  return record.category || 'record';
}

function getLocationName(record, clubs = {}, locations = {}) {
  if (record.club_name) return record.club_name;
  if (record.club_id && clubs[record.club_id]) return clubs[record.club_id].name;
  if (record.location_name) return record.location_name;
  if (record.range_name) return record.range_name;
  if (record.place_name) return record.place_name;
  if (record.venue_name) return record.venue_name;
  if (record.location_id && locations[record.location_id]) return locations[record.location_id].name;
  return 'Location not recorded';
}

function getTargetSummary(record, rifles = {}, clubs = {}, locations = {}) {
  const riflesUsed = Array.isArray(record.rifles_used) ? record.rifles_used : [];
  const totalRounds = riflesUsed.length
    ? riflesUsed.reduce((sum, item) => sum + (parseInt(item.rounds_fired, 10) || 0), 0)
    : (parseInt(record.rounds_fired, 10) || 0);
  const firstRifle = riflesUsed[0];
  const rifleName = firstRifle?.rifle_id ? rifles[firstRifle.rifle_id]?.name : (record.rifle_id ? rifles[record.rifle_id]?.name : null);
  const ammo = firstRifle?.ammunition_brand || record.ammunition_used;
  const distance = firstRifle?.meters_range || record.meters_range;

  return {
    title: `Target Shooting${totalRounds ? ` - ${totalRounds} rounds` : ''}`,
    location: getLocationName(record, clubs, locations),
    rows: [
      rifleName && ['Rifle', rifleName],
      ammo && ['Ammunition', ammo],
      totalRounds ? ['Rounds', totalRounds] : null,
      distance && ['Distance', `${distance}m`],
    ].filter(Boolean),
  };
}

function getClaySummary(record, shotguns = {}, clubs = {}, locations = {}, clayScorecards = {}, clayStands = {}) {
  const scoreSummary = getClayScoreSummary(clayScorecards[record.id], clayStands[record.id] || []);
  const shotgunName = record.shotgun_id ? shotguns[record.shotgun_id]?.name : null;
  const clubName = resolveClayClubName(record, clubs, locations);

  return {
    title: `Clay Shooting - ${scoreSummary ? scoreSummary.label : `${record.rounds_fired || 0} cartridges`}`,
    location: clubName,
    rows: [
      clubName && ['Club / Range', clubName],
      shotgunName && ['Shotgun', shotgunName],
      ['Cartridges', record.rounds_fired || 0],
      scoreSummary && ['Score', scoreSummary.label],
      record.ammunition_used && ['Ammunition', record.ammunition_used],
    ].filter(Boolean),
  };
}

function getDeerSummary(record, rifles = {}, locations = {}) {
  const harvest = Array.isArray(record.species_list) && record.species_list.length
    ? record.species_list.map(item => `${item.species} (${item.count})`).join(', ')
    : null;
  const shots = Number(record.rounds_fired || record.number_shot || record.total_count || 0);
  const rifleName = record.rifle_id ? rifles[record.rifle_id]?.name : null;

  return {
    title: harvest ? `Deer Management: ${harvest}` : 'Deer Management - No shots fired',
    location: getLocationName(record, {}, locations),
    rows: [
      ['Location', getLocationName(record, {}, locations)],
      rifleName && ['Rifle', rifleName],
      record.ammunition_used && ['Ammunition', record.ammunition_used],
      shots ? ['Rounds', shots] : ['Shots', 'No shots fired'],
      harvest && ['Harvest / Pest', harvest],
    ].filter(Boolean),
  };
}

export default function RecordCard({
  record,
  onDelete,
  onView,
  onViewTrack,
  onViewPhoto,
  onEdit,
  onPdf,
  generatingPdf = false,
  rifles = {},
  shotguns = {},
  clubs = {},
  locations = {},
  clayScorecards = {},
  clayStands = {},
}) {
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const recordType = getRecordType(record);

  const summary = useMemo(() => {
    if (recordType === 'target') return getTargetSummary(record, rifles, clubs, locations);
    if (recordType === 'clay') return getClaySummary(record, shotguns, clubs, locations, clayScorecards, clayStands);
    if (recordType === 'deer') return getDeerSummary(record, rifles, locations);
    return { title: record.title || typeLabel[recordType] || 'Session Record', location: getLocationName(record, clubs, locations), rows: [] };
  }, [record, recordType, rifles, shotguns, clubs, locations, clayScorecards, clayStands]);

  const photos = record.photos || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg break-words text-foreground" style={{ overflowWrap: 'anywhere' }}>{summary.title}</h3>
            {isPendingOfflineRecord(record) && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">Pending sync</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {record.date ? format(new Date(record.date), 'MMM d, yyyy') : 'Date not recorded'}
            {(record.checkin_time || record.start_time) ? ` at ${record.checkin_time || record.start_time}` : ''} • {typeLabel[recordType] || 'Record'}
          </p>
          <p className="text-sm text-muted-foreground">{summary.location}</p>
          {summary.rows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
              {summary.rows.map(([label, value]) => (
                <p key={`${label}-${value}`}><span className="font-bold text-muted-foreground">{label}:</span> {value}</p>
              ))}
            </div>
          )}
          {photos.length > 0 && <p className="text-xs text-muted-foreground mt-2">{photos.length} photo{photos.length !== 1 ? 's' : ''} attached</p>}
          {record.notes && <p className="text-xs text-foreground mt-2 line-clamp-2">{record.notes}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {photos.length > 0 && onViewPhoto && (
            <div className="relative inline-block">
              <button
                className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
                title="View photo"
                onClick={photos.length === 1 ? () => onViewPhoto(photos[0]) : () => setShowPhotoMenu(!showPhotoMenu)}
              >
                <Image className="w-4 h-4" />
                {photos.length > 1 && <ChevronDown className="w-3 h-3" />}
              </button>
              {photos.length > 1 && showPhotoMenu && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded shadow-lg z-10">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => { onViewPhoto(photo); setShowPhotoMenu(false); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors whitespace-nowrap first:rounded-t last:rounded-b"
                    >
                      Photo {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onView && (
            <button onClick={() => onView(record)} className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1" title="View details">
              <Eye className="w-4 h-4" />
            </button>
          )}
          {record.gps_track?.length > 0 && onViewTrack && (
            <button onClick={() => onViewTrack(record.gps_track)} className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1" title="View GPS track">
              <Map className="w-4 h-4" />
            </button>
          )}
          {onPdf && (
            <button onClick={() => onPdf(record)} disabled={generatingPdf} className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1 disabled:opacity-50" title="PDF Preview">
              {generatingPdf ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(record)} className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1" title="Edit record">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(record)} className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1" title="Delete record">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}