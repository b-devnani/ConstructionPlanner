import { D1Database } from '@cloudflare/workers-types';

export async function getLocations(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM locations ORDER BY name').all();
  return results;
}

export async function getContractors(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM contractors ORDER BY name').all();
  return results;
}

export async function getActivities(db: D1Database) {
  const { results } = await db.prepare(`
    SELECT 
      a.*,
      l.name as location_name,
      c.name as contractor_name
    FROM activities a
    JOIN locations l ON a.location_id = l.id
    JOIN contractors c ON a.contractor_id = c.id
    ORDER BY a.start_date
  `).all();
  
  return results.map(activity => ({
    ...activity,
    location: { id: activity.location_id, name: activity.location_name },
    contractor: { id: activity.contractor_id, name: activity.contractor_name }
  }));
}

export async function getActivitiesInDateRange(db: D1Database, startDate: string, endDate: string) {
  const { results } = await db.prepare(`
    SELECT 
      a.*,
      l.name as location_name,
      c.name as contractor_name
    FROM activities a
    JOIN locations l ON a.location_id = l.id
    JOIN contractors c ON a.contractor_id = c.id
    WHERE 
      (a.start_date <= ? AND a.end_date >= ?) OR
      (a.start_date >= ? AND a.start_date <= ?)
    ORDER BY a.start_date
  `)
  .bind(endDate, startDate, startDate, endDate)
  .all();
  
  return results.map(activity => ({
    ...activity,
    location: { id: activity.location_id, name: activity.location_name },
    contractor: { id: activity.contractor_id, name: activity.contractor_name }
  }));
}

export async function createActivity(db: D1Database, activity: {
  name: string;
  location_id: number;
  contractor_id: number;
  start_date: string;
  end_date: string;
  duration: number;
}) {
  const { success } = await db.prepare(`
    INSERT INTO activities (name, location_id, contractor_id, start_date, end_date, duration)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  .bind(
    activity.name,
    activity.location_id,
    activity.contractor_id,
    activity.start_date,
    activity.end_date,
    activity.duration
  )
  .run();
  
  return success;
}

export async function updateActivity(db: D1Database, id: number, activity: {
  name?: string;
  location_id?: number;
  contractor_id?: number;
  start_date?: string;
  end_date?: string;
  duration?: number;
}) {
  const updates = [];
  const values = [];
  
  if (activity.name) {
    updates.push('name = ?');
    values.push(activity.name);
  }
  
  if (activity.location_id) {
    updates.push('location_id = ?');
    values.push(activity.location_id);
  }
  
  if (activity.contractor_id) {
    updates.push('contractor_id = ?');
    values.push(activity.contractor_id);
  }
  
  if (activity.start_date) {
    updates.push('start_date = ?');
    values.push(activity.start_date);
  }
  
  if (activity.end_date) {
    updates.push('end_date = ?');
    values.push(activity.end_date);
  }
  
  if (activity.duration) {
    updates.push('duration = ?');
    values.push(activity.duration);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  if (updates.length === 0) {
    return false;
  }
  
  const { success } = await db.prepare(`
    UPDATE activities
    SET ${updates.join(', ')}
    WHERE id = ?
  `)
  .bind(...values, id)
  .run();
  
  return success;
}

export async function deleteActivity(db: D1Database, id: number) {
  const { success } = await db.prepare('DELETE FROM activities WHERE id = ?')
    .bind(id)
    .run();
  
  return success;
}
