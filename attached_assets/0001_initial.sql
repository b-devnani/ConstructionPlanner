-- Migration number: 0001 	 2025-03-25T04:08:28.000Z
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS contractors;
DROP TABLE IF EXISTS locations;

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create contractors table
CREATE TABLE IF NOT EXISTS contractors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  contractor_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL, -- in days
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES locations (id),
  FOREIGN KEY (contractor_id) REFERENCES contractors (id)
);

-- Create indexes
CREATE INDEX idx_activities_start_date ON activities(start_date);
CREATE INDEX idx_activities_end_date ON activities(end_date);
CREATE INDEX idx_activities_location_id ON activities(location_id);
CREATE INDEX idx_activities_contractor_id ON activities(contractor_id);

-- Insert sample data for locations
INSERT INTO locations (name) VALUES 
  ('1974 Bldg'),
  ('1897 Bldg - 1st Floor'),
  ('1897 Bldg - 2nd Floor'),
  ('1897 Bldg - 3rd Floor'),
  ('1897 Bldg - 4th Floor');

-- Insert sample data for contractors
INSERT INTO contractors (name, contact_person, phone, email) VALUES 
  ('ABC Drywall', 'John Smith', '555-123-4567', 'john@abcdrywall.com'),
  ('XYZ Electrical', 'Jane Doe', '555-987-6543', 'jane@xyzelectrical.com'),
  ('123 Plumbing', 'Bob Johnson', '555-456-7890', 'bob@123plumbing.com'),
  ('Best Painting', 'Sarah Williams', '555-789-0123', 'sarah@bestpainting.com'),
  ('Pro Flooring', 'Mike Brown', '555-321-6540', 'mike@proflooring.com');

-- Insert sample data for activities
INSERT INTO activities (name, location_id, contractor_id, start_date, end_date, duration) VALUES 
  ('Drywall Installation', 1, 1, '2025-03-18', '2025-03-26', 9),
  ('Electrical Rough-In', 2, 2, '2025-03-20', '2025-03-28', 9),
  ('Plumbing Rough-In', 3, 3, '2025-03-22', '2025-03-30', 9),
  ('Interior Painting', 4, 4, '2025-03-25', '2025-04-02', 9),
  ('Flooring Installation', 5, 5, '2025-03-27', '2025-04-04', 9),
  ('Selective Demo', 2, 1, '2025-03-15', '2025-03-22', 8),
  ('Interior Demo', 3, 1, '2025-03-17', '2025-03-24', 8),
  ('Abatement', 4, 5, '2025-03-19', '2025-03-26', 8),
  ('Total Building Demo', 1, 1, '2025-03-16', '2025-03-30', 15);
