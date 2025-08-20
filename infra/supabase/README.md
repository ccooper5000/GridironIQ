These SQL files define the initial schema, RLS policies, and Storage rules for GridIronIQ.

- `000_init.sql`: tables, helper function, RPC `init_user`.
- `001_rls.sql`: enables RLS + per-table policies.
- `002_storage.sql`: creates `videos` bucket and user-scoped Storage policies.
