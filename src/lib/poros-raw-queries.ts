import { prisma } from './prisma';

// Types for raw SQL results
export interface PorosConfession {
  id: string;
  event_id: string;
  day: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string | null;
  is_active: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PorosInfoItem {
  id: string;
  event_id: string;
  title: string;
  content: string;
  type: string;
  url: string | null;
  is_active: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PorosAdoration {
  id: string;
  event_id: string;
  day: string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string | null;
  is_active: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

// Camelcase versions for API responses
export interface PorosConfessionCamel {
  id: string;
  eventId: string;
  day: string;
  startTime: string;
  endTime: string | null;
  location: string;
  description: string | null;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PorosInfoItemCamel {
  id: string;
  eventId: string;
  title: string;
  content: string;
  type: string;
  url: string | null;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PorosAdorationCamel {
  id: string;
  eventId: string;
  day: string;
  startTime: string;
  endTime: string | null;
  location: string;
  description: string | null;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to convert snake_case to camelCase
function toCamelCase<R>(obj: Record<string, unknown>): R {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as R;
}

// ============ CONFESSIONS ============

export async function getConfessions(eventId: string, activeOnly = false): Promise<PorosConfessionCamel[]> {
  let rows: PorosConfession[];
  if (activeOnly) {
    rows = await prisma.$queryRaw<PorosConfession[]>`
      SELECT * FROM poros_confessions
      WHERE event_id = ${eventId}::uuid AND is_active = true
      ORDER BY "order" ASC, day ASC, start_time ASC
    `;
  } else {
    rows = await prisma.$queryRaw<PorosConfession[]>`
      SELECT * FROM poros_confessions
      WHERE event_id = ${eventId}::uuid
      ORDER BY "order" ASC, day ASC, start_time ASC
    `;
  }
  return rows.map(row => toCamelCase<PorosConfessionCamel>(row as unknown as Record<string, unknown>));
}

export async function getConfessionById(id: string): Promise<PorosConfessionCamel | null> {
  const rows = await prisma.$queryRaw<PorosConfession[]>`
    SELECT * FROM poros_confessions WHERE id = ${id}::uuid LIMIT 1
  `;
  return rows.length > 0 ? toCamelCase<PorosConfessionCamel>(rows[0] as unknown as Record<string, unknown>) : null;
}

export async function createConfession(data: {
  eventId: string;
  day: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosConfessionCamel> {
  const rows = await prisma.$queryRaw<PorosConfession[]>`
    INSERT INTO poros_confessions (event_id, day, start_time, end_time, location, description, is_active, "order")
    VALUES (
      ${data.eventId}::uuid,
      ${data.day},
      ${data.startTime},
      ${data.endTime || null},
      ${data.location},
      ${data.description || null},
      ${data.isActive ?? true},
      ${data.order ?? 0}
    )
    RETURNING *
  `;
  return toCamelCase<PorosConfessionCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function updateConfession(id: string, data: {
  day?: string;
  startTime?: string;
  endTime?: string | null;
  location?: string;
  description?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosConfessionCamel> {
  const rows = await prisma.$queryRaw<PorosConfession[]>`
    UPDATE poros_confessions SET
      day = COALESCE(${data.day ?? null}, day),
      start_time = COALESCE(${data.startTime ?? null}, start_time),
      end_time = COALESCE(${data.endTime ?? null}, end_time),
      location = COALESCE(${data.location ?? null}, location),
      description = COALESCE(${data.description ?? null}, description),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      "order" = COALESCE(${data.order ?? null}, "order"),
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return toCamelCase<PorosConfessionCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function deleteConfession(id: string): Promise<void> {
  await prisma.$queryRaw`DELETE FROM poros_confessions WHERE id = ${id}::uuid`;
}

// ============ INFO ITEMS ============

export async function getInfoItems(eventId: string, activeOnly = false): Promise<PorosInfoItemCamel[]> {
  let rows: PorosInfoItem[];
  if (activeOnly) {
    rows = await prisma.$queryRaw<PorosInfoItem[]>`
      SELECT * FROM poros_info_items
      WHERE event_id = ${eventId}::uuid AND is_active = true
      ORDER BY "order" ASC, title ASC
    `;
  } else {
    rows = await prisma.$queryRaw<PorosInfoItem[]>`
      SELECT * FROM poros_info_items
      WHERE event_id = ${eventId}::uuid
      ORDER BY "order" ASC, title ASC
    `;
  }
  return rows.map(row => toCamelCase<PorosInfoItemCamel>(row as unknown as Record<string, unknown>));
}

export async function getInfoItemById(id: string): Promise<PorosInfoItemCamel | null> {
  const rows = await prisma.$queryRaw<PorosInfoItem[]>`
    SELECT * FROM poros_info_items WHERE id = ${id}::uuid LIMIT 1
  `;
  return rows.length > 0 ? toCamelCase<PorosInfoItemCamel>(rows[0] as unknown as Record<string, unknown>) : null;
}

export async function createInfoItem(data: {
  eventId: string;
  title: string;
  content: string;
  type?: string;
  url?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosInfoItemCamel> {
  const rows = await prisma.$queryRaw<PorosInfoItem[]>`
    INSERT INTO poros_info_items (event_id, title, content, type, url, is_active, "order")
    VALUES (
      ${data.eventId}::uuid,
      ${data.title},
      ${data.content},
      ${data.type || 'info'},
      ${data.url || null},
      ${data.isActive ?? true},
      ${data.order ?? 0}
    )
    RETURNING *
  `;
  return toCamelCase<PorosInfoItemCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function updateInfoItem(id: string, data: {
  title?: string;
  content?: string;
  type?: string;
  url?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosInfoItemCamel> {
  const rows = await prisma.$queryRaw<PorosInfoItem[]>`
    UPDATE poros_info_items SET
      title = COALESCE(${data.title ?? null}, title),
      content = COALESCE(${data.content ?? null}, content),
      type = COALESCE(${data.type ?? null}, type),
      url = COALESCE(${data.url ?? null}, url),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      "order" = COALESCE(${data.order ?? null}, "order"),
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return toCamelCase<PorosInfoItemCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function deleteInfoItem(id: string): Promise<void> {
  await prisma.$queryRaw`DELETE FROM poros_info_items WHERE id = ${id}::uuid`;
}

// ============ ADORATION ============

export async function getAdorations(eventId: string, activeOnly = false): Promise<PorosAdorationCamel[]> {
  let rows: PorosAdoration[];
  if (activeOnly) {
    rows = await prisma.$queryRaw<PorosAdoration[]>`
      SELECT * FROM poros_adoration
      WHERE event_id = ${eventId}::uuid AND is_active = true
      ORDER BY "order" ASC, day ASC, start_time ASC
    `;
  } else {
    rows = await prisma.$queryRaw<PorosAdoration[]>`
      SELECT * FROM poros_adoration
      WHERE event_id = ${eventId}::uuid
      ORDER BY "order" ASC, day ASC, start_time ASC
    `;
  }
  return rows.map(row => toCamelCase<PorosAdorationCamel>(row as unknown as Record<string, unknown>));
}

export async function getAdorationById(id: string): Promise<PorosAdorationCamel | null> {
  const rows = await prisma.$queryRaw<PorosAdoration[]>`
    SELECT * FROM poros_adoration WHERE id = ${id}::uuid LIMIT 1
  `;
  return rows.length > 0 ? toCamelCase<PorosAdorationCamel>(rows[0] as unknown as Record<string, unknown>) : null;
}

export async function createAdoration(data: {
  eventId: string;
  day: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  description?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosAdorationCamel> {
  const rows = await prisma.$queryRaw<PorosAdoration[]>`
    INSERT INTO poros_adoration (event_id, day, start_time, end_time, location, description, is_active, "order")
    VALUES (
      ${data.eventId}::uuid,
      ${data.day},
      ${data.startTime},
      ${data.endTime || null},
      ${data.location},
      ${data.description || null},
      ${data.isActive ?? true},
      ${data.order ?? 0}
    )
    RETURNING *
  `;
  return toCamelCase<PorosAdorationCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function updateAdoration(id: string, data: {
  day?: string;
  startTime?: string;
  endTime?: string | null;
  location?: string;
  description?: string | null;
  isActive?: boolean;
  order?: number;
}): Promise<PorosAdorationCamel> {
  const rows = await prisma.$queryRaw<PorosAdoration[]>`
    UPDATE poros_adoration SET
      day = COALESCE(${data.day ?? null}, day),
      start_time = COALESCE(${data.startTime ?? null}, start_time),
      end_time = COALESCE(${data.endTime ?? null}, end_time),
      location = COALESCE(${data.location ?? null}, location),
      description = COALESCE(${data.description ?? null}, description),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      "order" = COALESCE(${data.order ?? null}, "order"),
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  return toCamelCase<PorosAdorationCamel>(rows[0] as unknown as Record<string, unknown>);
}

export async function deleteAdoration(id: string): Promise<void> {
  await prisma.$queryRaw`DELETE FROM poros_adoration WHERE id = ${id}::uuid`;
}
