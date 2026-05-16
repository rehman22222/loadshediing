// scripts/seed_complete_schedule.js
require("dotenv").config();
const mongoose = require("mongoose");
const minimist = require("minimist");

const Outage = require("../models/Outage");
const Area = require("../models/Area");
const User = require("../models/User");
const { forwardGeocode } = require("../services/geocode");
const { connectMongoose } = require("../utils/dbConnection");

// Complete schedule data from the PDF
const COMPLETE_SCHEDULE_DATA = `33/E Korangi Town 0935~1105 1305~1435 1605~1735 2235~0005
36 B RMU Korangi East 0705~0905 1205~1405 1705~2005 2305~0205
3A RMU Landhi 0935~1205 1435~1735 1905~2135 2335~0135
3H RMU Site 0705~0835 1035~1205 1435~1605 1735~1905
500 Quarter KEPZ 0935~1205 1435~1735 1905~2135 2335~0135
51 - C (Ex-Korangi Telephone Exchange # 03) Korangi South 1105~1335 1535~1835 2005~2235 0005~0205
52 A KEPZ 0735~0905 1135~1305 1635~1805 2005~2135
5-C Bilal Abad (Ex-Bank Alfalah) Korangi South 0905~1135 1335~1635 1835~2105 2235~0035
7 A RMU Korangi East 0905~1135 1335~1635 1835~2105 2235~0035
A. Haroon Park (Ex-Hijrat Colony-2) Queens Road 0705~0935 1135~1435 1635~1905 2135~2335
A-1 Center Civic Center 0705~0935 1105~1405 1635~1905 2105~2305
Abbas Bawazir Airport 1105~1335 1535~1835 2005~2235 0005~0205
Abbasi Nagar P R L 1005~1135 1305~1435 1635~1805 2135~2305
Abdul Ghani Gulistan E Johar 0935~1105 1305~1435 1605~1735 2235~0005
Abdul Mannan Garden East 0705~0835 1105~1235 1505~1635 1905~2035
Abdul Rehman KDA 0935~1105 1305~1435 1605~1735 2235~0005
Abdullah Gabol Village (Ex-Sector Y) Gulshan-E-Maymar 0805~1035 1205~1505 1735~2005 2205~0005
Abidabad (Ex-Mushtaq 1) Site 0705~0935 1135~1435 1605~1835 2105~2305
Achanak Hotel Shadman 0705~0935 1135~1435 1605~1835 2105~2305
Acil Valika 1105~1335 1505~1805 2005~2235 0005~0205
Adam Hingora Goth Malir 0905~1135 1335~1635 1835~2105 2235~0035
Adullah Shah Ghazi Goth (Ex. Al-Azhar Garden) KDA 0905~1135 1335~1635 1835~2105 2235~0035
Afnan Gulistan E Johar 0935~1205 1435~1735 1905~2135 2335~0135
Afridi Colony Baldia 0835~1105 1305~1605 1735~2005 2135~2335
Afzal Motor Port Qasim 0805~1035 1205~1505 1735~2005 2205~0005
Agha Shahi Gadap 0905~1135 1335~1635 1835~2105 2235~0035
Ahsan Hotel Site 1105~1335 1505~1805 2005~2235 0005~0205
Ahsan Medical Surjani Town 0705~0935 1205~1505 1635~1905 2135~2335
Ahsanabad Phase-Iv Gulshan-E-Maymar 0905~1135 1335~1635 1835~2105 2235~0035
Airport Telephone Exchange Airport 0935~1205 1435~1735 1905~2135 2335~0135
Akram Store RMU Baldia 0705~0905 1205~1405 1705~2005 2305~0205
Al Khair Bakers Hospital 1105~1335 1535~1835 2005~2235 0005~0205
Al Wajid Town Site 1105~1335 1505~1805 2005~2235 0005~0205
Al Watan Surjani Town 1035~1305 1435~1735 1935~2205 2335~0135
Al-Akhwan Masjid Federal B 0935~1205 1335~1635 1905~2135 2305~0105
Al-Asif Sq Federal B 1035~1305 1435~1735 1935~2205 2335~0135
Aleem Paradise Surjani Town 1035~1305 1435~1735 1935~2205 2335~0135
Aleemabad (Ex-Indus Mehran) Malir 0905~1135 1335~1635 1835~2105 2235~0035
Al-Fatah Orangi Town 1105~1335 1505~1805 2005~2235 0005~0205
Al-Fawad Medical Baldia 0705~0935 1135~1435 1635~1905 2135~2335
Al-Hira North Karachi 0705~0935 1135~1435 1605~1835 2105~2305
Ali Akber Shah Korangi South 0935~1105 1305~1435 1605~1735 2235~0005
Ali Brohi RMU Landhi 0805~1035 1205~1505 1735~2005 2205~0005
Ali Garh Bazar North Nazimabad 1035~1305 1435~1735 1935~2205 2335~0135
Ali Ice Korangi Town 0705~0835 1035~1205 1505~1635 1805~1935
Alif Laila Baldia 0835~1105 1305~1605 1735~2005 2135~2335
Alkaram Square Liaquatabad 0735~0905 1205~1335 1805~1935 2105~2235
All Pakistan Patni Muslim Jamaat Gulshan-E-Maymar 0905~1135 1335~1635 1835~2105 2235~0035
Allahabad Town RMU Hub Chowki 0705~0935 1135~1435 1605~1835 2105~2305
Al-Madina Godhra Federal B 0935~1205 1335~1635 1905~2135 2305~0105
Al-Maroof Sweets Old Golimar 0835~1105 1305~1605 1735~2005 2135~2335
Al-Memon Chs Federal A 0935~1105 1505~1635 1805~1935 2135~2305
Al-Mumtaz Valika 1105~1335 1505~1805 2005~2235 0005~0205
Al-Syed Centre Landhi 0935~1205 1435~1735 1905~2135 2335~0135
Alvi Road Lyari 0835~1105 1305~1605 1735~2005 2135~2335
Amalgamated Korangi East 1105~1335 1535~1835 2005~2235 0005~0205
Amazon Baldia 0935~1205 1405~1705 1905~2135 0005~0205
Amba Jee Villa Jee Garden East 0705~0935 1205~1505 1635~1905 2135~2335
Amber Garment Malir 0905~1135 1335~1635 1835~2105 2235~0035
Ameen Mazda Labour Square 0705~0935 1135~1435 1635~1905 2135~2335
Ana Crown RMU (Ex - Ghanchi Para) Garden East 0735~0905 1235~1405 2005~2135 0035~0205
Anamta Society Surjani Town 1035~1305 1435~1735 1935~2205 2335~0135
Anwar Mama Pmt Korangi Town 1105~1335 1535~1835 2005~2235 0005~0205`;

async function ensureSystemUser() {
  const email = process.env.SYSTEM_USER_EMAIL || "system@loadshedding.local";
  let user = await User.findOne({ email });
  if (!user) {
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("change-me-not-used", salt);
    
    user = new User({
      username: "system-loader",
      email,
      password: hashedPassword,
      role: "premium"
    });
    await user.save();
    console.log(`✅ Created system user: ${email}`);
  }
  return user;
}

/**
 * Convert time string (HHMM format) to Date object
 */
function parseTimeToDate(timeStr, dateISO) {
  const hours = parseInt(timeStr.slice(0, 2), 10);
  const minutes = parseInt(timeStr.slice(2, 4), 10);
  
  const date = new Date(`${dateISO}T00:00:00.000Z`);
  date.setHours(hours, minutes, 0, 0);
  
  return date;
}

/**
 * Extract area name and determine city based on common patterns
 */
function extractAreaInfo(fullAreaName) {
  // Map common area suffixes to cities
  const cityMap = {
    'Korangi Town': 'Karachi',
    'Korangi East': 'Karachi', 
    'Korangi South': 'Karachi',
    'Korangi West': 'Karachi',
    'Landhi': 'Karachi',
    'Site': 'Karachi',
    'KEPZ': 'Karachi',
    'Queens Road': 'Karachi',
    'Civic Center': 'Karachi',
    'Airport': 'Karachi',
    'P R L': 'Karachi',
    'Gulistan E Johar': 'Karachi',
    'Garden East': 'Karachi',
    'KDA': 'Karachi',
    'Gulshan-E-Maymar': 'Karachi',
    'Shadman': 'Karachi',
    'Valika': 'Karachi',
    'Malir': 'Karachi',
    'Baldia': 'Karachi',
    'Port Qasim': 'Karachi',
    'Gadap': 'Karachi',
    'Surjani Town': 'Karachi',
    'Federal B': 'Karachi',
    'Federal A': 'Karachi',
    'Orangi Town': 'Karachi',
    'North Karachi': 'Karachi',
    'North Nazimabad': 'Karachi',
    'Liaquatabad': 'Karachi',
    'Old Golimar': 'Karachi',
    'Lyari': 'Karachi',
    'Hub Chowki': 'Karachi',
    'Labour Square': 'Karachi',
    'Clifton': 'Karachi',
    'Mauripur': 'Karachi',
    'West Wharf': 'Karachi',
    'Jail Road': 'Karachi',
    'Azizabad': 'Karachi',
    'Airport 2': 'Karachi',
    'Old Town': 'Karachi',
    'Memon Goth': 'Karachi',
    'Jacobline': 'Karachi',
    'Civil Aviation': 'Karachi',
    'R E C P': 'Karachi',
    'Elender Rd': 'Karachi',
    'Hospital': 'Karachi',
    'Mehmoodabad': 'Karachi',
    'Qayyumabad': 'Karachi',
    'Gizri': 'Karachi',
    'Baloch Colony': 'Karachi',
    'New Landhi': 'Karachi',
    'Dhabeji': 'Karachi',
    'Gharo': 'Karachi',
    'Haroonabad': 'Karachi'
  };

  let city = 'Karachi'; // Default
  for (const [suffix, mappedCity] of Object.entries(cityMap)) {
    if (fullAreaName.includes(suffix)) {
      city = mappedCity;
      break;
    }
  }

  return {
    name: fullAreaName,
    city: city
  };
}

async function ensureAreaExists(areaName) {
  let area = await Area.findOne({ 
    name: { $regex: new RegExp(`^${areaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  });
  
  if (!area) {
    const areaInfo = extractAreaInfo(areaName);
    console.log(`🔍 Creating new area: ${areaName} in ${areaInfo.city}`);
    
    let coordinates = null;
    try {
      // Try to geocode the area
      const geo = await forwardGeocode(`${areaName}, Karachi`);
      if (geo) {
        coordinates = {
          type: "Point",
          coordinates: [geo.lon, geo.lat]
        };
      }
      // Add small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(`⚠️ Could not geocode ${areaName}: ${err.message}`);
    }

    area = new Area({
      name: areaInfo.name,
      city: areaInfo.city,
      location: coordinates || { type: "Point", coordinates: [0, 0] },
      locationIqPlaceId: null
    });
    
    await area.save();
    console.log(`✅ Created area: ${areaName}`);
  }
  
  return area;
}

async function main() {
  const argv = minimist(process.argv.slice(2));
  const forcedDate = argv.date || argv.d || "2025-06-26";
  const commit = !!argv.commit;
  const replace = !!argv.replace;

  if (!commit) {
    console.log("🧪 DRY RUN MODE - Use --commit to actually insert data");
  }

  console.log(`📅 Processing schedule for date: ${forcedDate}`);

  await connectMongoose();
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.db.databaseName}`);

  const systemUser = await ensureSystemUser();

  // Parse the schedule data
  const lines = COMPLETE_SCHEDULE_DATA.trim().split('\n');
  const allOutages = [];
  let processedAreas = 0;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;

    // Extract area name (everything except the last 4 time slots)
    const timeSlots = parts.slice(-4);
    const areaName = parts.slice(0, -4).join(' ');

    console.log(`📍 Processing: ${areaName}`);
    
    // Ensure area exists in database
    const area = commit ? await ensureAreaExists(areaName) : null;
    processedAreas++;

    // Parse each time slot
    for (const timeSlot of timeSlots) {
      if (!timeSlot.includes('~')) continue;
      
      const [startTimeStr, endTimeStr] = timeSlot.split('~');
      
      try {
        const startTime = parseTimeToDate(startTimeStr, forcedDate);
        const endTime = parseTimeToDate(endTimeStr, forcedDate);
        
        // Handle midnight crossover
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1);
        }

        const outageData = {
          areaId: area?._id || null,
          area: areaName,
          city: area?.city || "Karachi",
          startTime: startTime,
          endTime: endTime,
          status: "ongoing",
          reportedBy: systemUser._id,
          location: area?.location || { type: "Point", coordinates: [0, 0] }
        };

        allOutages.push(outageData);
      } catch (err) {
        console.error(`❌ Error parsing time slot ${timeSlot} for ${areaName}:`, err.message);
      }
    }

    // Progress indicator
    if (processedAreas % 50 === 0) {
      console.log(`📊 Progress: ${processedAreas} areas processed, ${allOutages.length} outages prepared`);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`   • Areas processed: ${processedAreas}`);
  console.log(`   • Total outages: ${allOutages.length}`);
  console.log(`   • Date: ${forcedDate}`);

  if (!commit) {
    console.log("\n💡 This was a dry run. Add --commit to save to database");
    console.log("💡 Add --replace to remove existing data for this date first");
    await mongoose.disconnect();
    return;
  }

  // Handle replacement if requested
  if (replace) {
    const start = new Date(`${forcedDate}T00:00:00.000Z`);
    const end = new Date(`${forcedDate}T23:59:59.999Z`);
    const deleteResult = await Outage.deleteMany({
      reportedBy: systemUser._id,
      startTime: { $gte: start, $lte: end }
    });
    console.log(`🧹 Deleted ${deleteResult.deletedCount} existing outages for ${forcedDate}`);
  }

  // Insert the outages
  if (allOutages.length > 0) {
    try {
      const result = await Outage.insertMany(allOutages, { ordered: false });
      console.log(`✅ Successfully inserted ${result.length} outages`);
    } catch (err) {
      if (err.writeErrors) {
        console.log(`⚠️ Inserted ${err.result.insertedCount} outages with ${err.writeErrors.length} errors`);
      } else {
        console.error("❌ Insert failed:", err.message);
      }
    }
  } else {
    console.log("⚠️ No outages to insert");
  }

  await mongoose.disconnect();
  console.log("🏁 Finished");
}

main().catch(err => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
