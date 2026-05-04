import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getTodayInLondon() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firearm_type, firearm_id } = await req.json();

    if (!['rifle', 'shotgun'].includes(firearm_type)) {
      return Response.json({ error: 'firearm_type must be rifle or shotgun' }, { status: 400 });
    }

    if (!firearm_id) {
      return Response.json({ error: 'Missing firearm_id' }, { status: 400 });
    }

    const entity = firearm_type === 'rifle'
      ? base44.asServiceRole.entities.Rifle
      : base44.asServiceRole.entities.Shotgun;

    const firearm = await entity.get(firearm_id);

    if (!firearm) {
      return Response.json({ error: 'Firearm not found' }, { status: 404 });
    }

    if (firearm.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: firearm does not belong to you' }, { status: 403 });
    }

    const today = getTodayInLondon();
    const totalAtCleaning = firearm_type === 'rifle'
      ? (firearm.total_rounds_fired || 0)
      : (firearm.total_cartridges_fired || 0);
    const previousBaseline = firearm_type === 'rifle'
      ? (firearm.rounds_at_last_cleaning || 0)
      : (firearm.cartridges_at_last_cleaning || 0);
    const roundsSincePrevious = Math.max(0, totalAtCleaning - previousBaseline);

    const update = firearm_type === 'rifle'
      ? {
          rounds_at_last_cleaning: totalAtCleaning,
          last_cleaning_date: today,
        }
      : {
          cartridges_at_last_cleaning: totalAtCleaning,
          last_cleaning_date: today,
        };

    const updatedFirearm = await entity.update(firearm_id, update);

    const history = await base44.entities.CleaningHistory.create({
      firearm_id,
      firearm_type,
      firearm_name: firearm.name || '',
      cleaning_date: today,
      total_rounds_at_cleaning: totalAtCleaning,
      rounds_since_previous_cleaning: roundsSincePrevious,
    });

    return Response.json({
      success: true,
      firearm: updatedFirearm,
      history,
    });
  } catch (error) {
    console.error('[markFirearmCleanedForUser] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});