import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import PhotoUpload from '@/components/PhotoUpload';
import { DESIGN } from '@/lib/designConstants';

const POI_TYPES = [
  { value: 'deer_sighting', label: '🦌 Deer Sighting', title: 'Deer Sighting' },
  { value: 'high_seat', label: '🪑 High Seat', title: 'High Seat' },
  { value: 'tracks_signs', label: '👣 Tracks / Signs', title: 'Tracks / Signs' },
  { value: 'animal', label: '🐾 Other Animal', title: 'Other Animal' },
  { value: 'feeding_area', label: '🌾 Feeding Area', title: 'Feeding Area' },
  { value: 'other', label: '📍 Other', title: 'Other' },
];

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];
const SIGN_TYPES = ['Tracks', 'Droppings', 'Scrape', 'Rub', 'Bedding area', 'Damage', 'Other'];
const PEST_SPECIES = ['Fox', 'Rabbit', 'Grey Squirrel', 'Rat', 'Crow', 'Magpie', 'Pigeon', 'Mink', 'Other'];

const emptyData = {
  title: '',
  species: '',
  sex: '',
  age_class: '',
  quantity: '1',
  sign_type: '',
  animal_category: 'Pest Control',
  pest_species: '',
  custom_animal_name: '',
  feed_type: '',
  notes: '',
  photos: [],
};

export default function POIModal({ location, onClose, onSubmit }) {
  const [type, setType] = useState('');
  const [data, setData] = useState(emptyData);

  const selectedType = POI_TYPES.find(opt => opt.value === type);
  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const handleSelectType = (value) => {
    setType(value);
    setData(emptyData);
  };

  const handleSubmit = () => {
    onSubmit({ type, ...data, quantity: parseInt(data.quantity) || 1 });
  };

  const renderTextInput = (label, field, placeholder = '') => (
    <div>
      <label className={DESIGN.LABEL}>{label}</label>
      <input type="text" value={data[field]} onChange={(e) => update(field, e.target.value)} className={DESIGN.INPUT} placeholder={placeholder} />
    </div>
  );

  const renderSelect = (label, field, options, placeholder = 'Select') => (
    <div>
      <label className={DESIGN.LABEL}>{label}</label>
      <select value={data[field]} onChange={(e) => update(field, e.target.value)} className={DESIGN.INPUT}>
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const renderCommonFields = () => (
    <>
      <div>
        <label className={DESIGN.LABEL}>Notes</label>
        <textarea value={data.notes} onChange={(e) => update('notes', e.target.value)} className={DESIGN.INPUT} rows="3" placeholder="Add any notes about this location..." />
      </div>
      <div>
        <label className={DESIGN.LABEL}>Photos</label>
        <PhotoUpload photos={data.photos} onPhotosChange={(photos) => update('photos', photos)} />
      </div>
    </>
  );

  const renderFields = () => {
    if (type === 'deer_sighting') {
      return (
        <>
          {renderSelect('Deer species', 'species', DEER_SPECIES, 'Select species')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderSelect('Sex (optional)', 'sex', ['Male', 'Female', 'Unknown'], 'Optional')}
            {renderSelect('Age class (optional)', 'age_class', ['Adult', 'Yearling', 'Juvenile', 'Unknown'], 'Optional')}
          </div>
          <div>
            <label className={DESIGN.LABEL}>Quantity / number seen</label>
            <input type="number" min="1" value={data.quantity} onChange={(e) => update('quantity', e.target.value)} className={DESIGN.INPUT} />
          </div>
          {renderCommonFields()}
        </>
      );
    }

    if (type === 'high_seat') {
      return <>{renderTextInput('High seat name', 'title', 'e.g. North Wood High Seat')}{renderCommonFields()}</>;
    }

    if (type === 'tracks_signs') {
      return <>{renderSelect('Sign type', 'sign_type', SIGN_TYPES, 'Select sign type')}{renderCommonFields()}</>;
    }

    if (type === 'animal') {
      return (
        <>
          {renderSelect('Animal category', 'animal_category', ['Pest Control', 'Other Wildlife'], 'Select category')}
          {data.animal_category === 'Pest Control'
            ? renderSelect('Pest species', 'pest_species', PEST_SPECIES, 'Select pest species')
            : renderTextInput('Animal name', 'custom_animal_name', 'Enter animal name')}
          {renderCommonFields()}
        </>
      );
    }

    if (type === 'feeding_area') {
      return <>{renderTextInput('Feeding area name (optional)', 'title')}{renderTextInput('Feed type (optional)', 'feed_type')}{renderCommonFields()}</>;
    }

    if (type === 'other') {
      return <>{renderTextInput('Point name / title', 'title')}{renderCommonFields()}</>;
    }

    return null;
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={selectedType ? `Add ${selectedType.title}` : 'Add Point of Interest'}
      subtitle={`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      onSubmit={selectedType ? handleSubmit : undefined}
      primaryAction={selectedType ? `Save ${selectedType.title}` : undefined}
      secondaryAction="Cancel"
      footer={!selectedType ? (
        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors active:scale-95">
          Cancel
        </button>
      ) : undefined}
    >
      {!selectedType ? (
        <div>
          <label className={DESIGN.LABEL}>Choose POI type</label>
          <div className="grid grid-cols-2 gap-2">
            {POI_TYPES.map(opt => (
              <button key={opt.value} type="button" onClick={() => handleSelectType(opt.value)} className="p-2.5 rounded-xl border-2 text-sm font-medium transition-all border-border hover:border-primary hover:bg-primary/10 hover:text-primary">
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {renderFields()}
        </div>
      )}
    </GlobalModal>
  );
}