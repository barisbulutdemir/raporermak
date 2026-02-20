/**
 * Lightweight runtime migration for SQLite using better-sqlite3.
 * Adds any missing columns defined in the schema without dropping existing data.
 * This runs at container startup before the Next.js server.
 */
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('file:', '')
    : '/app/prisma/dev.db'

console.log(`[prisma-push] Using database at: ${dbPath}`)

const db = new Database(dbPath)

/** All columns we expect, per table */
const expectedColumns = {
    User: [
        { name: 'id', type: 'TEXT    NOT NULL PRIMARY KEY' },
        { name: 'username', type: 'TEXT    NOT NULL UNIQUE' },
        { name: 'password', type: 'TEXT    NOT NULL' },
        { name: 'name', type: 'TEXT' },
        { name: 'signature', type: 'TEXT' },
        { name: 'monthlySalary', type: 'REAL' },
        { name: 'role', type: "TEXT    NOT NULL DEFAULT 'USER'" },
        { name: 'approved', type: 'INTEGER NOT NULL DEFAULT 0' },
        { name: 'isActive', type: 'INTEGER NOT NULL DEFAULT 1' },
        { name: 'approvedBy', type: 'TEXT' },
        { name: 'approvedAt', type: 'DATETIME' },
        { name: 'createdAt', type: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: 'DATETIME NOT NULL' },
    ]
}

for (const [table, columns] of Object.entries(expectedColumns)) {
    // Check if table exists
    const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(table)

    if (!tableExists) {
        console.log(`[prisma-push] Table ${table} does not exist, skipping.`)
        continue
    }

    // Get existing columns
    const existing = db.prepare(`PRAGMA table_info(${table})`).all()
    const existingNames = existing.map(c => c.name)

    for (const col of columns) {
        if (!existingNames.includes(col.name)) {
            const sql = `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.type}`
            console.log(`[prisma-push] Adding column: ${sql}`)
            db.exec(sql)
        }
    }
}

db.close()
console.log('[prisma-push] Done.')
