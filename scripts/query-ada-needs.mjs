/**
 * Query all ADA/accessibility needs across the system.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/query-ada-needs.mjs
 *
 * Or if .env.local exists:
 *   node --env-file=.env.local scripts/query-ada-needs.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Try to load .env.local manually if DATABASE_URL not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^(\w+)=["']?(.+?)["']?\s*$/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch (e) {
    // ignore
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('Provide it via .env.local or as an environment variable.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // 1) AdaIndividual records
    console.log('\n' + '='.repeat(70));
    console.log('  ADA INDIVIDUALS TABLE');
    console.log('='.repeat(70));
    const adaResult = await client.query(`
      SELECT
        ai.name,
        ai.gender,
        ai.accessibility_need,
        ai.notes,
        r.name AS room_name,
        r.room_number
      FROM ada_individuals ai
      LEFT JOIN rooms r ON r.id = ai.room_id
      ORDER BY ai.name
    `);
    if (adaResult.rows.length === 0) {
      console.log('  (No records found)\n');
    } else {
      console.log(`  Found ${adaResult.rows.length} record(s):\n`);
      for (const row of adaResult.rows) {
        console.log(`  Name: ${row.name}`);
        console.log(`  Gender: ${row.gender || 'N/A'}`);
        console.log(`  Need: ${row.accessibility_need}`);
        console.log(`  Notes: ${row.notes || 'N/A'}`);
        console.log(`  Room: ${row.room_name ? `${row.room_name} (#${row.room_number})` : 'Not assigned'}`);
        console.log('  ---');
      }
    }

    // 2) LiabilityForm with ADA accommodations
    console.log('\n' + '='.repeat(70));
    console.log('  LIABILITY FORMS WITH ADA ACCOMMODATIONS');
    console.log('='.repeat(70));
    const liabilityResult = await client.query(`
      SELECT
        lf.participant_first_name || ' ' || lf.participant_last_name AS participant_name,
        lf.participant_type,
        lf.participant_age,
        lf.participant_gender,
        o.name AS organization,
        gr.church_name,
        lf.ada_accommodations,
        lf.form_status,
        lf.completed_at
      FROM liability_forms lf
      LEFT JOIN organizations o ON o.id = lf.organization_id
      LEFT JOIN group_registrations gr ON gr.id = lf.group_registration_id
      WHERE lf.ada_accommodations IS NOT NULL
        AND lf.ada_accommodations != ''
        AND TRIM(lf.ada_accommodations) != ''
      ORDER BY lf.participant_last_name, lf.participant_first_name
    `);
    if (liabilityResult.rows.length === 0) {
      console.log('  (No records found)\n');
    } else {
      console.log(`  Found ${liabilityResult.rows.length} record(s):\n`);
      for (const row of liabilityResult.rows) {
        console.log(`  Name: ${row.participant_name}`);
        console.log(`  Type: ${row.participant_type || 'N/A'} | Age: ${row.participant_age || 'N/A'} | Gender: ${row.participant_gender || 'N/A'}`);
        console.log(`  Organization: ${row.organization || 'N/A'}`);
        console.log(`  Church: ${row.church_name || 'N/A'}`);
        console.log(`  ADA Accommodations: ${row.ada_accommodations}`);
        console.log(`  Form Status: ${row.form_status} | Completed: ${row.completed_at || 'N/A'}`);
        console.log('  ---');
      }
    }

    // 3) IndividualRegistration with ADA accommodations
    console.log('\n' + '='.repeat(70));
    console.log('  INDIVIDUAL REGISTRATIONS WITH ADA ACCOMMODATIONS');
    console.log('='.repeat(70));
    const individualResult = await client.query(`
      SELECT
        ir.first_name || ' ' || ir.last_name AS participant_name,
        ir.preferred_name,
        ir.email,
        ir.phone,
        ir.gender,
        o.name AS organization,
        ir.ada_accommodations,
        ir.registration_status,
        ir.registered_at
      FROM individual_registrations ir
      LEFT JOIN organizations o ON o.id = ir.organization_id
      WHERE ir.ada_accommodations IS NOT NULL
        AND ir.ada_accommodations != ''
        AND TRIM(ir.ada_accommodations) != ''
      ORDER BY ir.last_name, ir.first_name
    `);
    if (individualResult.rows.length === 0) {
      console.log('  (No records found)\n');
    } else {
      console.log(`  Found ${individualResult.rows.length} record(s):\n`);
      for (const row of individualResult.rows) {
        console.log(`  Name: ${row.participant_name}${row.preferred_name ? ` (${row.preferred_name})` : ''}`);
        console.log(`  Email: ${row.email || 'N/A'} | Phone: ${row.phone || 'N/A'}`);
        console.log(`  Gender: ${row.gender || 'N/A'}`);
        console.log(`  Organization: ${row.organization || 'N/A'}`);
        console.log(`  ADA Accommodations: ${row.ada_accommodations}`);
        console.log(`  Status: ${row.registration_status} | Registered: ${row.registered_at || 'N/A'}`);
        console.log('  ---');
      }
    }

    // 4) Combined summary
    console.log('\n' + '='.repeat(70));
    console.log('  COMBINED ADA NEEDS SUMMARY');
    console.log('='.repeat(70));
    const combinedResult = await client.query(`
      SELECT name, source, organization, church, accommodation FROM (
        SELECT
          ai.name,
          'ADA Individual Record' AS source,
          NULL AS organization,
          NULL AS church,
          ai.accessibility_need AS accommodation
        FROM ada_individuals ai

        UNION ALL

        SELECT
          lf.participant_first_name || ' ' || lf.participant_last_name AS name,
          'Liability Form' AS source,
          o.name AS organization,
          gr.church_name AS church,
          lf.ada_accommodations AS accommodation
        FROM liability_forms lf
        LEFT JOIN organizations o ON o.id = lf.organization_id
        LEFT JOIN group_registrations gr ON gr.id = lf.group_registration_id
        WHERE lf.ada_accommodations IS NOT NULL
          AND lf.ada_accommodations != ''
          AND TRIM(lf.ada_accommodations) != ''

        UNION ALL

        SELECT
          ir.first_name || ' ' || ir.last_name AS name,
          'Individual Registration' AS source,
          o.name AS organization,
          NULL AS church,
          ir.ada_accommodations AS accommodation
        FROM individual_registrations ir
        LEFT JOIN organizations o ON o.id = ir.organization_id
        WHERE ir.ada_accommodations IS NOT NULL
          AND ir.ada_accommodations != ''
          AND TRIM(ir.ada_accommodations) != ''
      ) combined
      ORDER BY name
    `);

    if (combinedResult.rows.length === 0) {
      console.log('  No ADA/accessibility needs found anywhere in the system.\n');
    } else {
      console.log(`  TOTAL: ${combinedResult.rows.length} person(s) with ADA needs:\n`);
      for (const row of combinedResult.rows) {
        const group = [row.organization, row.church].filter(Boolean).join(' / ') || 'N/A';
        console.log(`  Name: ${row.name}`);
        console.log(`  Source: ${row.source}`);
        console.log(`  Group/Church: ${group}`);
        console.log(`  Accommodation: ${row.accommodation}`);
        console.log('  ---');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Query failed:', err.message);
  process.exit(1);
});
