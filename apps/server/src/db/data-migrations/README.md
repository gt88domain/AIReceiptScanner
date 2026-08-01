# Data migrations

Use this directory for versioned transformations between valid data shapes.
Each operation must be idempotent, document its source and target, and include
a verification query or command. Do not change table structure here.
