-- After creating and seeding the tables, run relations.sql to add foreign keys.
CREATE DATABASE IF NOT EXISTS sfReact_project;
USE sfReact_project;
DROP TABLE IF EXISTS workflow_runs;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  industry VARCHAR(100) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  annual_revenue DECIMAL(15,2) DEFAULT 0,
  billing_city VARCHAR(100) DEFAULT '',
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(190) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  title VARCHAR(120) DEFAULT '',
  account_id VARCHAR(36) DEFAULT NULL,
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (account_id),
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY,
  first_name VARCHAR(100) DEFAULT '',
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(160) NOT NULL,
  email VARCHAR(190) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  status VARCHAR(30) DEFAULT 'New',
  lead_source VARCHAR(40) DEFAULT 'Website',
  rating VARCHAR(20) DEFAULT 'Warm',
  industry VARCHAR(100) DEFAULT '',
  owner_id VARCHAR(36) NOT NULL,
  converted_account_id VARCHAR(36) DEFAULT NULL,
  converted_contact_id VARCHAR(36) DEFAULT NULL,
  converted_opportunity_id VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  stage_name VARCHAR(40) DEFAULT 'Prospecting',
  amount DECIMAL(15,2) DEFAULT 0,
  close_date DATE DEFAULT NULL,
  probability INT DEFAULT 10,
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (account_id),
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(36) PRIMARY KEY,
  case_number BIGINT NOT NULL AUTO_INCREMENT UNIQUE,
  subject VARCHAR(180) NOT NULL,
  description TEXT,
  account_id VARCHAR(36) DEFAULT NULL,
  contact_id VARCHAR(36) DEFAULT NULL,
  status VARCHAR(30) DEFAULT 'New',
  priority VARCHAR(20) DEFAULT 'Medium',
  origin VARCHAR(20) DEFAULT 'Web',
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(36) PRIMARY KEY,
  subject VARCHAR(180) NOT NULL,
  status VARCHAR(30) DEFAULT 'Not Started',
  priority VARCHAR(20) DEFAULT 'Normal',
  activity_date DATE DEFAULT NULL,
  related_to_id VARCHAR(36) DEFAULT NULL,
  owner_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (owner_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_id VARCHAR(36) NOT NULL,
  actor_name VARCHAR(100) NOT NULL,
  resource VARCHAR(40) NOT NULL,
  action VARCHAR(20) NOT NULL,
  record_id VARCHAR(36) NOT NULL,
  record_label VARCHAR(180) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (created_at)
);

DELETE FROM audit_logs;
DELETE FROM tasks;
DELETE FROM cases;
DELETE FROM leads;
DELETE FROM opportunities;
DELETE FROM contacts;
DELETE FROM accounts;
DELETE FROM users;

INSERT INTO users (id, name, role) VALUES
  ('u1', 'Morgan Admin', 'admin'),
  ('u2', 'Daniel Manager', 'manager'),
  ('u3', 'Riya Sales', 'sales'),
  ('u4', 'Sam Support', 'support');

INSERT INTO accounts (id, name, industry, website, phone, annual_revenue, billing_city, owner_id) VALUES
  ('a1', 'Aurora Technologies', 'Technology', 'https://aurora.example.com', '+91 40 5550 1001', 7500000, 'Hyderabad', 'u3'),
  ('a2', 'BluePeak Analytics', 'Analytics', 'https://bluepeak.example.com', '+91 80 5550 1002', 4500000, 'Bengaluru', 'u3'),
  ('a3', 'Evergreen Health', 'Healthcare', 'https://evergreen.example.com', '+91 44 5550 1003', 12000000, 'Chennai', 'u2'),
  ('a4', 'Nimbus Education', 'Education', 'https://nimbus.example.com', '+91 20 5550 1004', 2800000, 'Pune', 'u2'),
  ('a5', 'Harbor Logistics', 'Logistics', 'https://harbor.example.com', '+91 22 5550 1005', 6800000, 'Mumbai', 'u3'),
  ('a6', 'Crestline Finance', 'Financial Services', 'https://crestline.example.com', '+91 11 5550 1006', 9800000, 'New Delhi', 'u2'),
  ('a7', 'Verdant Foods', 'Consumer Goods', 'https://verdant.example.com', '+91 33 5550 1007', 3600000, 'Kolkata', 'u3'),
  ('a8', 'Meridian Mobility', 'Automotive', 'https://meridian.example.com', '+91 79 5550 1008', 8400000, 'Ahmedabad', 'u2');

INSERT INTO contacts (id, first_name, last_name, email, phone, title, account_id, owner_id) VALUES
  ('c1', 'Ananya', 'Rao', 'ananya.rao@aurora.example.com', '+91 90000 1001', 'Chief Technology Officer', 'a1', 'u3'),
  ('c2', 'Ravi', 'Kumar', 'ravi.kumar@bluepeak.example.com', '+91 90000 1002', 'Procurement Director', 'a2', 'u3'),
  ('c3', 'Meera', 'Sharma', 'meera.sharma@evergreen.example.com', '+91 90000 1003', 'Operations Director', 'a3', 'u2'),
  ('c4', 'Tarun', 'Nair', 'tarun.nair@nimbus.example.com', '+91 90000 1004', 'Learning Director', 'a4', 'u2'),
  ('c5', 'Isha', 'Kapoor', 'isha.kapoor@harbor.example.com', '+91 90000 1005', 'Supply Chain Manager', 'a5', 'u3'),
  ('c6', 'Arjun', 'Malhotra', 'arjun.malhotra@crestline.example.com', '+91 90000 1006', 'VP, Digital Operations', 'a6', 'u2'),
  ('c7', 'Priya', 'Sen', 'priya.sen@verdant.example.com', '+91 90000 1007', 'Commercial Director', 'a7', 'u3'),
  ('c8', 'Vikram', 'Patel', 'vikram.patel@meridian.example.com', '+91 90000 1008', 'Head of Fleet Technology', 'a8', 'u2');

INSERT INTO leads (id, first_name, last_name, company, email, phone, status, lead_source, rating, industry, owner_id) VALUES
  ('l1', 'Kavya', 'Menon', 'Skyline Labs', 'kavya.menon@skylinelabs.example.com', '+91 90000 2001', 'New', 'Website', 'Hot', 'Technology', 'u3'),
  ('l2', 'Ayaan', 'Khan', 'Mercury Retail', 'ayaan.khan@mercury.example.com', '+91 90000 2002', 'Working', 'Webinar', 'Warm', 'Retail', 'u3'),
  ('l3', 'Nisha', 'Verma', 'Crest Finance', 'nisha.verma@crestfinance.example.com', '+91 90000 2003', 'Qualified', 'Referral', 'Hot', 'Finance', 'u3'),
  ('l4', 'Rohan', 'Das', 'Oakridge Manufacturing', 'rohan.das@oakridge.example.com', '+91 90000 2004', 'New', 'Outbound', 'Cold', 'Manufacturing', 'u2'),
  ('l5', 'Sana', 'Iqbal', 'Lumen Travel', 'sana.iqbal@lumentravel.example.com', '+91 90000 2005', 'Working', 'Partner', 'Warm', 'Travel', 'u3'),
  ('l6', 'Dev', 'Joshi', 'Granite Materials', 'dev.joshi@granite.example.com', '+91 90000 2006', 'Nurturing', 'Event', 'Warm', 'Construction', 'u2'),
  ('l7', 'Leena', 'George', 'Pulse Diagnostics', 'leena.george@pulse.example.com', '+91 90000 2007', 'Qualified', 'Referral', 'Hot', 'Healthcare', 'u3'),
  ('l8', 'Kabir', 'Singh', 'Northwind Energy', 'kabir.singh@northwind.example.com', '+91 90000 2008', 'New', 'Website', 'Cold', 'Energy', 'u2');

INSERT INTO opportunities (id, name, account_id, stage_name, amount, close_date, probability, owner_id) VALUES
  ('o1', 'Aurora Enterprise Platform', 'a1', 'Proposal', 250000, DATE_ADD(CURRENT_DATE, INTERVAL 22 DAY), 50, 'u3'),
  ('o2', 'BluePeak Data Modernization', 'a2', 'Negotiation', 180000, DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), 75, 'u3'),
  ('o3', 'Evergreen Patient Portal', 'a3', 'Qualification', 320000, DATE_ADD(CURRENT_DATE, INTERVAL 38 DAY), 25, 'u2'),
  ('o4', 'Nimbus Learning Platform', 'a4', 'Closed Won', 90000, DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), 100, 'u2'),
  ('o5', 'Harbor Fleet Integration', 'a5', 'Proposal', 420000, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 60, 'u3'),
  ('o6', 'Crestline Risk Suite', 'a6', 'Value Proposition', 560000, DATE_ADD(CURRENT_DATE, INTERVAL 45 DAY), 40, 'u2'),
  ('o7', 'Verdant Distribution Analytics', 'a7', 'Needs Analysis', 210000, DATE_ADD(CURRENT_DATE, INTERVAL 18 DAY), 20, 'u3'),
  ('o8', 'Meridian Connected Fleet', 'a8', 'Closed Lost', 675000, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 0, 'u2');

INSERT INTO cases (id, subject, description, account_id, contact_id, status, priority, origin, owner_id) VALUES
  ('s1', 'Unable to access the customer portal', 'User receives an authorization error after sign-in.', 'a1', 'c1', 'Working', 'High', 'Web', 'u4'),
  ('s2', 'Invoice mismatch', 'Invoice total differs from the approved quote.', 'a2', 'c2', 'New', 'Medium', 'Email', 'u4'),
  ('s3', 'API rate limit alert', 'Integration exceeds configured API throughput.', 'a3', 'c3', 'Escalated', 'Critical', 'Phone', 'u4'),
  ('s4', 'Training completion certificate', 'Customer requests an updated completion certificate.', 'a4', 'c4', 'Closed', 'Low', 'Chat', 'u4'),
  ('s5', 'Shipment tracking data delay', 'Tracking events are arriving later than expected.', 'a5', 'c5', 'Working', 'High', 'Email', 'u4'),
  ('s6', 'Report export timeout', 'Large monthly reports stop before export completes.', 'a6', 'c6', 'New', 'Medium', 'Web', 'u4'),
  ('s7', 'Sales forecast discrepancy', 'Regional totals do not match the finance summary.', 'a7', 'c7', 'Escalated', 'High', 'Phone', 'u4'),
  ('s8', 'Mobile app sync issue', 'Field service updates are not syncing consistently.', 'a8', 'c8', 'Working', 'Medium', 'Chat', 'u4');

INSERT INTO tasks (id, subject, status, priority, activity_date, related_to_id, owner_id) VALUES
  ('t1', 'Call Aurora CTO about proposal', 'In Progress', 'High', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'o1', 'u3'),
  ('t2', 'Review BluePeak pricing', 'Not Started', 'Normal', DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), 'o2', 'u3'),
  ('t3', 'Prepare Evergreen requirements', 'In Progress', 'Normal', DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'o3', 'u2'),
  ('t4', 'Investigate critical API case', 'In Progress', 'High', CURRENT_DATE, 's3', 'u4'),
  ('t5', 'Confirm Harbor implementation scope', 'Not Started', 'High', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'o5', 'u3'),
  ('t6', 'Send Crestline security overview', 'In Progress', 'Normal', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'o6', 'u2'),
  ('t7', 'Schedule Verdant data review', 'Not Started', 'Normal', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'o7', 'u3'),
  ('t8', 'Close Meridian lost-opportunity follow-up', 'Completed', 'Low', CURRENT_DATE, 'o8', 'u2');
