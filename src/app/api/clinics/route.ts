import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import dbConnect from '@/lib/mongodb';
import Clinic from '@/lib/mongodb/models/clinic.model';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Validate the data
    const { name, latitude, longitude, email, phone, licenseNumber, password } = body;
    
    if (!name || !latitude || !longitude || !email || !phone || !licenseNumber || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Additional validation
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Latitude must be a number between -90 and 90' },
        { status: 400 }
      );
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Longitude must be a number between -180 and 180' },
        { status: 400 }
      );
    }
    
    // Check if clinic already exists
    const existingClinic = await Clinic.findOne({ 
      $or: [
        { email },
        { licenseNumber }
      ]
    });
    
    if (existingClinic) {
      return NextResponse.json(
        { error: 'Clinic already registered. Please log in.' },
        { status: 409 }
      );
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new clinic
    const clinic = await Clinic.create({
      name,
      latitude: lat,
      longitude: lng,
      email,
      phone,
      licenseNumber,
      password: hashedPassword,
    });
    
    // Return success without including password
    return NextResponse.json({ 
      success: true,
      message: `Congratulations! ${name} is successfully registered to DonorLink`,
      clinic: {
        id: clinic._id,
        name: clinic.name,
        email: clinic.email
      }
    });
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A clinic with this email or license number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}