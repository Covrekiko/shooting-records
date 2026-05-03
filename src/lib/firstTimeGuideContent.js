export const FIRST_TIME_GUIDES = {
  targetSessionCreate: {
    guideKey: 'seenGuide_targetSessionCreate',
    title: 'Create Target Shooting Session',
    description: 'A quick guide to recording a rifle range session.',
    steps: [
      'Select date, range, rifle, distance, and ammunition.',
      'Add rounds fired and shooting notes.',
      'Upload target photos if needed.',
      'Save the session to create a professional record and update ammunition stock.',
    ],
  },
  claySessionCreate: {
    guideKey: 'seenGuide_claySessionCreate',
    title: 'Create Clay Shooting Session',
    description: 'A quick guide to recording a clay shooting session.',
    steps: [
      'Select date, club or location, shotgun, and cartridge type.',
      'Enter shots fired, clays, score, and notes.',
      'Save the session to keep your clay shooting record and update ammunition stock.',
    ],
  },
  deerOutingCreate: {
    guideKey: 'seenGuide_deerOutingCreate',
    title: 'Start Deer Stalking Outing',
    description: 'A quick guide to starting and completing a stalking outing.',
    steps: [
      'Select the stalking area or land block.',
      'Check in to record your start time and location.',
      'Use the map to track your outing if needed.',
      'At check-out, add shots, deer or cull details, notes, photos, and save the record.',
    ],
  },
  stalkingAreaCreate: {
    guideKey: 'seenGuide_stalkingAreaCreate',
    title: 'Create Stalking Area',
    description: 'A quick guide to drawing a land boundary.',
    steps: [
      'Search or move the map to your land.',
      'Tap points around the boundary.',
      'Close the boundary when finished.',
      'Save the area so it appears in your stalking map and outing selector.',
    ],
  },
  poiCreate: {
    guideKey: 'seenGuide_poiCreate',
    title: 'Add Point of Interest',
    description: 'A quick guide to saving useful map markers.',
    steps: [
      'Choose the POI type, such as deer sighting, high seat, tracks/signs, feeding area, or other.',
      'Add notes and photos.',
      'Save the POI to show it on the stalking map.',
      'Tap the marker later to view the saved details.',
    ],
  },
  highSeatCreate: {
    guideKey: 'seenGuide_highSeatCreate',
    title: 'Add High Seat',
    description: 'A quick guide to marking a high seat on the stalking map.',
    steps: [
      'Place the marker at the exact high seat location.',
      'Add a clear name, notes, and photos if useful.',
      'Save it so the high seat appears on your stalking map.',
      'Tap the marker later to view or manage the saved details.',
    ],
  },
  ammoCreate: {
    guideKey: 'seenGuide_ammoCreate',
    title: 'Add Ammunition Stock',
    description: 'A quick guide to adding ammunition to inventory.',
    steps: [
      'Enter calibre or gauge, brand, type, quantity, and cost.',
      'Save it to your ammunition inventory.',
      'When you record a shooting session, used ammunition will be deducted from stock.',
    ],
  },
  reloadingBatchCreate: {
    guideKey: 'seenGuide_reloadingBatchCreate',
    title: 'Create Reloading Batch',
    description: 'A quick guide to creating a reload batch.',
    steps: [
      'Select brass, powder, primers, and bullets from stock.',
      'Enter charge weight and batch quantity.',
      'Save the batch to create reloaded ammunition and update component stock.',
    ],
  },
  firearmCreate: {
    guideKey: 'seenGuide_firearmCreate',
    title: 'Add Firearm',
    description: 'A quick guide to adding a rifle to your armory.',
    steps: [
      'Enter make, model, calibre, and serial number.',
      'Save it to your armory.',
      'Use it later in target, deer, cleaning, and PDF records.',
    ],
  },
  shotgunCreate: {
    guideKey: 'seenGuide_shotgunCreate',
    title: 'Add Shotgun',
    description: 'A quick guide to adding a shotgun to your armory.',
    steps: [
      'Enter make, model, gauge, barrel length, and serial number.',
      'Save it to your armory.',
      'Use it later in clay shooting, cleaning, and PDF records.',
    ],
  },
  cleaningCreate: {
    guideKey: 'seenGuide_cleaningCreate',
    title: 'Add Cleaning Record',
    description: 'A quick guide to recording firearm maintenance.',
    steps: [
      'Select the rifle or shotgun.',
      'Add cleaning notes and date.',
      'Save to reset rounds since cleaning and keep maintenance history.',
    ],
  },
};