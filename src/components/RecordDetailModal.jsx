import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getRepository } from '@/lib/offlineSupport';
import { format } from 'date-fns';
import GlobalModal from '@/components/ui/GlobalModal.jsx';

const Field = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-medium break-words" style={{ overflowWrap: 'anywhere' }}>{value}</p>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-5">
    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">{title}</h3>
    <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
      {children}
    </div>
  </div>
);

const CATEGORY_CONFIG = {
  target: { label: 'Target Shooting', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  clay:   { label: 'Clay Shooting',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  deer:   { label: 'Deer Management', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

export default function RecordDetailModal({ record, onClose, rifles, shotguns, clubs, locations }) {
  const [rec, setRec] = useState(record);

  useEffect(() => {
    getRepository('SessionRecord').get(record.id)
      .then(updated => { if (updated) setRec({ ...updated, recordType: record.recordType }); })
      .catch(() => {});
  }, [record.id]);

  const cat = CATEGORY_CONFIG[rec.recordType] || {};

  const getRifle = (id) => rifles[id];
  const getRifleName = (id) => rifles[id]?.name || 'Unknown Rifle';
  const getShotgun = (id) => shotguns[id];
  const getClub = (id) => clubs[id];
  const getLocation = (id) => locations[id];

  const checkinTime = rec.recordType === 'deer' ? rec.start_time : rec.checkin_time;
  const checkoutTime = rec.end_time || rec.checkout_time;

  const titleContent = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
      </div>
      <div className="text-base font-semibold">{format(new Date(rec.date), 'EEEE, d MMMM yyyy')}</div>
      {(checkinTime || checkoutTime) && (
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {checkinTime || '—'} → {checkoutTime || 'ongoing'}
        </p>
      )}
    </div>
  );

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={format(new Date(rec.date), 'EEEE, d MMMM yyyy')}
      subtitle={`${cat.label}${checkinTime ? ` · ${checkinTime}${checkoutTime ? ` → ${checkoutTime}` : ''}` : ''}`}
      maxWidth="max-w-xl"
      footer={
        <button onClick={onClose}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
          Close
        </button>
      }
    >
      <div>

          {/* Photos - Hidden for Target Shooting (shown below) */}
          {rec.photos?.length > 0 && rec.recordType !== 'target' && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Photos</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {rec.photos.map((photo, i) => (
                  <img key={i} src={photo} alt={`Photo ${i + 1}`}
                    className="h-28 w-28 flex-shrink-0 object-cover rounded-xl border border-border" />
                ))}
              </div>
            </div>
          )}

          {/* Target Shooting */}
          {rec.recordType === 'target' && (
            <>
              {getClub(rec.club_id) && (
                <Section title="Venue">
                  <Field label="Club" value={getClub(rec.club_id)?.name} />
                  <Field label="Location" value={getClub(rec.club_id)?.location} />
                </Section>
              )}

              {(rec.rifles_used?.length > 0 || rec.rifle_id) && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Firearms & Ammunition</p>
                  <div className="space-y-3">
                    {rec.rifles_used?.length > 0 ? rec.rifles_used.map((r, idx) => {
                      const rifle = getRifle(r.rifle_id);
                      return (
                        <div key={idx} className="bg-secondary/30 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b border-border">
                            <span className="text-xs text-muted-foreground font-medium">Firearm #{idx + 1}</span>
                            <span className="font-semibold text-sm">{r.rounds_fired || 0} rounds</span>
                          </div>
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Rifle" value={getRifleName(r.rifle_id)} />
                            {rifle?.make && <Field label="Make" value={rifle.make} />}
                            {rifle?.model && <Field label="Model" value={rifle.model} />}
                            {rifle?.caliber && <Field label="Caliber" value={rifle.caliber} />}
                            {rifle?.serial_number && <Field label="Serial No." value={rifle.serial_number} />}
                            {r.ammunition_brand && <Field label="Ammo Brand" value={r.ammunition_brand} />}
                            {r.bullet_type && <Field label="Bullet Type" value={r.bullet_type} />}
                            {r.grain && <Field label="Grain" value={r.grain} />}
                            {r.meters_range && <Field label="Range" value={`${r.meters_range}m`} />}
                          </div>
                        </div>
                      );
                    }) : rec.rifle_id ? (
                      <div className="bg-secondary/30 rounded-xl p-4">
                        <Field label="Rifle" value={getRifleName(rec.rifle_id)} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Clay Shooting */}
          {rec.recordType === 'clay' && (
            <>
              {getClub(rec.club_id) && (
                <Section title="Venue">
                  <Field label="Club" value={getClub(rec.club_id)?.name} />
                  <Field label="Location" value={getClub(rec.club_id)?.location} />
                </Section>
              )}

              {rec.shotgun_id && getShotgun(rec.shotgun_id) && (
                <Section title="Shotgun">
                  <Field label="Name" value={getShotgun(rec.shotgun_id)?.name} />
                  <div className="grid grid-cols-3 gap-3 min-w-0">
                    <Field label="Make" value={getShotgun(rec.shotgun_id)?.make} />
                    <Field label="Model" value={getShotgun(rec.shotgun_id)?.model} />
                    <Field label="Gauge" value={getShotgun(rec.shotgun_id)?.gauge} />
                  </div>
                  {getShotgun(rec.shotgun_id)?.serial_number && (
                    <Field label="Serial No." value={getShotgun(rec.shotgun_id)?.serial_number} />
                  )}
                </Section>
              )}

              <Section title="Session Stats">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Rounds Fired" value={rec.rounds_fired ? `${rec.rounds_fired} rounds` : null} />
                  <Field label="Ammunition" value={rec.ammunition_used} />
                </div>
              </Section>
            </>
          )}

          {/* Deer Management */}
          {rec.recordType === 'deer' && (
            <>
              {(getLocation(rec.location_id) || rec.place_name) && (
                <Section title="Location">
                  <Field label="Place" value={getLocation(rec.location_id)?.name || rec.place_name || rec.location_name} />
                  <Field label="Address" value={getLocation(rec.location_id)?.location_address} />
                </Section>
              )}

              {rec.total_count && rec.total_count !== '0' ? (
                <>
                  {rec.species_list?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Species Harvested</p>
                      <div className="space-y-2">
                        {rec.species_list.map((s, i) => (
                          <div key={i} className="flex justify-between items-center bg-secondary/30 rounded-xl px-4 py-2.5">
                            <span className="text-sm font-medium">{s.species}</span>
                            <span className="text-sm font-bold">{s.count}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between items-center bg-primary/10 rounded-xl px-4 py-2.5">
                        <span className="text-sm font-bold text-primary">Total Shots Fired</span>
                        <span className="text-sm font-bold text-primary">{rec.total_count}</span>
                      </div>
                    </div>
                  )}

                  {rec.rifle_id && getRifle(rec.rifle_id) && (
                    <Section title="Rifle & Ammunition">
                      <Field label="Rifle" value={getRifleName(rec.rifle_id)} />
                      <div className="grid grid-cols-3 gap-3 min-w-0">
                        <Field label="Make" value={getRifle(rec.rifle_id)?.make} />
                        <Field label="Model" value={getRifle(rec.rifle_id)?.model} />
                        <Field label="Caliber" value={getRifle(rec.rifle_id)?.caliber} />
                      </div>
                      {getRifle(rec.rifle_id)?.serial_number && (
                        <Field label="Serial No." value={getRifle(rec.rifle_id)?.serial_number} />
                      )}
                      <Field label="Ammunition" value={rec.ammunition_used} />
                    </Section>
                  )}
                </>
              ) : (
                <div className="bg-secondary/30 rounded-xl px-4 py-3 mb-5 text-sm text-muted-foreground">
                  No shots fired during this session
                </div>
              )}
            </>
          )}

          {/* Checkout/Session Photos for Target Shooting */}
          {rec.recordType === 'target' && rec.photos?.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Session Photos</p>
              <div className="grid grid-cols-4 gap-2">
                {rec.photos.map((photo, i) => {
                  const photoUrl = typeof photo === 'string' ? photo : photo.url;
                  return (
                    <button
                      key={i}
                      onClick={() => window.open(photoUrl, '_blank')}
                      className="relative group overflow-hidden rounded-lg border border-border"
                    >
                      <img src={photoUrl} alt={`Photo ${i + 1}`} className="h-24 w-24 object-cover" onError={(e) => e.target.style.display = 'none'} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">Open</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {rec.notes && (
            <Section title="Notes">
              <p className="text-sm whitespace-pre-wrap">{rec.notes}</p>
            </Section>
          )}

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Record ID: {rec.id} · Created {format(new Date(rec.created_date), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
    </GlobalModal>
  );
}