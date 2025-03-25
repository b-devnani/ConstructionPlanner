import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Mock data for testing since we're having DB connection issues
    const locations = [
      { id: 1, name: "1974 Bldg" },
      { id: 2, name: "1897 Bldg - 1st Floor" },
      { id: 3, name: "1897 Bldg - 2nd Floor" },
      { id: 4, name: "1897 Bldg - 3rd Floor" },
      { id: 5, name: "1897 Bldg - 4th Floor" }
    ];
    
    const contractors = [
      { id: 1, name: "ABC Drywall", contact_person: "John Smith", phone: "555-123-4567", email: "john@abcdrywall.com" },
      { id: 2, name: "XYZ Electrical", contact_person: "Jane Doe", phone: "555-987-6543", email: "jane@xyzelectrical.com" },
      { id: 3, name: "123 Plumbing", contact_person: "Bob Johnson", phone: "555-456-7890", email: "bob@123plumbing.com" },
      { id: 4, name: "Best Painting", contact_person: "Sarah Williams", phone: "555-789-0123", email: "sarah@bestpainting.com" },
      { id: 5, name: "Pro Flooring", contact_person: "Mike Brown", phone: "555-321-6540", email: "mike@proflooring.com" }
    ];
    
    return Response.json({ 
      locations,
      contractors
    });
  } catch (error) {
    console.error('Error fetching reference data:', error);
    return Response.json(
      { error: 'Failed to fetch reference data' },
      { status: 500 }
    );
  }
}
