USE sfReact_project;

ALTER TABLE accounts
  ADD CONSTRAINT fk_accounts_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE contacts
  ADD CONSTRAINT fk_contacts_account
  FOREIGN KEY (account_id) REFERENCES accounts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_contacts_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_leads_converted_account
  FOREIGN KEY (converted_account_id) REFERENCES accounts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_leads_converted_contact
  FOREIGN KEY (converted_contact_id) REFERENCES contacts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_leads_converted_opportunity
  FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE opportunities
  ADD CONSTRAINT fk_opportunities_account
  FOREIGN KEY (account_id) REFERENCES accounts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_opportunities_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE cases
  ADD CONSTRAINT fk_cases_account
  FOREIGN KEY (account_id) REFERENCES accounts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_cases_contact
  FOREIGN KEY (contact_id) REFERENCES contacts (id)
  ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_cases_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_owner
  FOREIGN KEY (owner_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_actor
  FOREIGN KEY (actor_id) REFERENCES users (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Polymorphic references intentionally have no single foreign key:
-- tasks.related_to_id and audit_logs.record_id
-- can each point to multiple CRM tables.
