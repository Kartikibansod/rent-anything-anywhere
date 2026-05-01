const dotenv = require("dotenv");
const path = require("path");
const { connectDB } = require("../config/db");
const { Listing } = require("../models/Listing");
const { User } = require("../models/User");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const BASE_LAT = 16.705;
const BASE_LNG = 74.2433;
const randomCoord = (base, range = 0.04) => base + (Math.random() - 0.5) * range;
const buildPhotoSet = (item) => {
  const [first] = item.photos || [];
  const seed = encodeURIComponent(`${item.title} ${item.category}`);
  const extras = [1, 2, 3, 4].map((index) => ({
    url: `https://source.unsplash.com/900x700/?${seed}&sig=${index}`,
    publicId: `${first?.publicId || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`
  }));
  return [first, ...extras].filter(Boolean).slice(0, 5);
};
const ensureDescription = (item) => {
  const description = item.description || `${item.title} available near Kolhapur.`;
  return description.length >= 20
    ? description
    : `${description} Well maintained and ready for student use.`;
};

const listings = [
  { title: "Atomic Habits by James Clear", type: "sell", askingPrice: 280, category: "Books", condition: "like_new", conditionDescription: "Read once, no highlights, spine intact", itemAge: "6 months", description: "Bestseller on habits.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg", publicId: "atomic-habits" }] },
  { title: "The Alchemist by Paulo Coelho", type: "rent", rentRates: { daily: 10, weekly: 60, monthly: 220 }, category: "Books", condition: "used", conditionDescription: "Some pencil marks, pages intact", itemAge: "1 year", description: "Classic novel.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg", publicId: "alchemist" }] },
  { title: "Rich Dad Poor Dad", type: "sell", askingPrice: 200, category: "Books", condition: "like_new", conditionDescription: "No marks, tight spine", itemAge: "3 months", description: "Finance classic.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg", publicId: "rich-dad" }] },
  { title: "Harry Potter Complete Set", type: "sell", askingPrice: 950, category: "Books", condition: "used", conditionDescription: "All 7 books, minor wear", itemAge: "2 years", description: "Complete HP series.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9780439708180-L.jpg", publicId: "harry-potter" }] },
  { title: "Class 12 Physics NCERT", type: "sell", askingPrice: 120, category: "Books", condition: "used", conditionDescription: "Highlighting in ch 3-5", itemAge: "1 year", description: "NCERT Physics Part 1 & 2.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9788174506269-L.jpg", publicId: "ncert-physics" }] },
  { title: "Engineering Mathematics - RK Kanodia", type: "rent", rentRates: { daily: 15, weekly: 90, monthly: 330 }, category: "Books", condition: "used", conditionDescription: "Solved examples marked", itemAge: "1 year", description: "Engg maths reference.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9788177091878-L.jpg", publicId: "rk-kanodia" }] },
  { title: "Data Structures - Cormen CLRS", type: "sell", askingPrice: 450, category: "Books", condition: "like_new", conditionDescription: "No marks, perfect", itemAge: "4 months", description: "Bible of algorithms.", photos: [{ url: "https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg", publicId: "clrs" }] },
  { title: "HP Pavilion Laptop 14 inch", type: "sell", askingPrice: 28000, category: "Electronics", condition: "used", conditionDescription: "Scratch on lid, battery 4hrs, charger included", itemAge: "2 years", description: "Intel i5, 8GB RAM, 512GB SSD.", photos: [{ url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400", publicId: "hp-laptop" }] },
  { title: "Apple iPad 9th Gen 64GB", type: "sell", askingPrice: 22000, category: "Electronics", condition: "like_new", conditionDescription: "Screen protector on, no scratches, box included", itemAge: "8 months", description: "Great for notes and studying.", photos: [{ url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400", publicId: "ipad" }] },
  { title: "Samsung Galaxy M32 6GB", type: "sell", askingPrice: 9500, category: "Electronics", condition: "used", conditionDescription: "Back cover cracked, screen perfect", itemAge: "1.5 years", description: "6000mAh battery.", photos: [{ url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400", publicId: "samsung-m32" }] },
  { title: "Sony WH-1000XM4 Headphones", type: "rent", rentRates: { daily: 150, weekly: 900, monthly: 3300 }, category: "Electronics", condition: "like_new", conditionDescription: "No scratches, case included", itemAge: "1 year", description: "Best noise cancelling.", photos: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400", publicId: "sony-headphones" }] },
  { title: "Canon EOS 1500D DSLR Camera", type: "rent", rentRates: { daily: 200, weekly: 1200, monthly: 4400 }, category: "Electronics", condition: "like_new", conditionDescription: "Lens clean, bag included", itemAge: "1.5 years", description: "Perfect for college events.", photos: [{ url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400", publicId: "canon-dslr" }] },
  { title: "JBL Flip 5 Bluetooth Speaker", type: "sell", askingPrice: 4500, category: "Electronics", condition: "used", conditionDescription: "Minor scuff, loud and clear", itemAge: "1 year", description: "Waterproof portable speaker.", photos: [{ url: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400", publicId: "jbl-flip5" }] },
  { title: "Dell 24 inch FHD Monitor", type: "sell", askingPrice: 7500, category: "Electronics", condition: "like_new", conditionDescription: "No dead pixels, HDMI included", itemAge: "6 months", description: "Full HD IPS monitor.", photos: [{ url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400", publicId: "dell-monitor" }] },
  { title: "Hero Sprint 26T Mountain Bike", type: "sell", askingPrice: 4500, category: "Cycles", condition: "used", conditionDescription: "New brake pads, gears smooth", itemAge: "2 years", description: "Sturdy MTB for campus.", photos: [{ url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", publicId: "hero-sprint" }] },
  { title: "Firefox Road Runner Pro", type: "rent", rentRates: { daily: 50, weekly: 300, monthly: 1100 }, category: "Cycles", condition: "like_new", conditionDescription: "Serviced last month, new tyres", itemAge: "1 year", description: "Lightweight road bike.", photos: [{ url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400", publicId: "firefox-road" }] },
  { title: "Btwin Riverside 120", type: "sell", askingPrice: 6500, category: "Cycles", condition: "like_new", conditionDescription: "Used 10 times, lock included", itemAge: "4 months", description: "City hybrid cycle.", photos: [{ url: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400", publicId: "btwin" }] },
  { title: "Atlas Cycles Gold 21 Speed", type: "rent", rentRates: { daily: 40, weekly: 240, monthly: 880 }, category: "Cycles", condition: "used", conditionDescription: "All 21 gears working", itemAge: "3 years", description: "Multi-speed cycle.", photos: [{ url: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400", publicId: "atlas-21" }] },
  { title: "Hercules Roadeo A50", type: "sell", askingPrice: 3800, category: "Cycles", condition: "used", conditionDescription: "Brakes perfect, tyres need air", itemAge: "2 years", description: "Reliable commute cycle.", photos: [{ url: "https://images.unsplash.com/photo-1505705694340-019e1e335916?w=400", publicId: "hercules-roadeo" }] },
  { title: "Wooden Study Table with Shelf", type: "sell", askingPrice: 2200, category: "Furniture", condition: "used", conditionDescription: "Stable, minor scratch", itemAge: "2 years", description: "Perfect hostel study table.", photos: [{ url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400", publicId: "study-table" }] },
  { title: "Single Bed with Mattress", type: "sell", askingPrice: 3500, category: "Furniture", condition: "used", conditionDescription: "Mattress firm, frame sturdy", itemAge: "3 years", description: "Complete single bed setup.", photos: [{ url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400", publicId: "single-bed" }] },
  { title: "Bean Bag XL Black", type: "sell", askingPrice: 1200, category: "Furniture", condition: "like_new", conditionDescription: "No tears, filling intact", itemAge: "6 months", description: "Comfortable XL bean bag.", photos: [{ url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400", publicId: "bean-bag" }] },
  { title: "Bookshelf 5 Tier Wooden", type: "sell", askingPrice: 1800, category: "Furniture", condition: "used", conditionDescription: "All shelves intact, minor wobble", itemAge: "2 years", description: "Large bookshelf.", photos: [{ url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400", publicId: "bookshelf" }] },
  { title: "Foldable Study Chair", type: "rent", rentRates: { daily: 30, weekly: 180, monthly: 660 }, category: "Furniture", condition: "like_new", conditionDescription: "Cushion intact, folds easily", itemAge: "1 year", description: "Ergonomic foldable chair.", photos: [{ url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400", publicId: "study-chair" }] },
  { title: "Nike Dri-FIT Running Tshirt", type: "sell", askingPrice: 450, category: "Clothes", condition: "like_new", conditionDescription: "Worn twice, no stains", itemAge: "3 months", description: "Size L. Great for gym.", photos: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", publicId: "nike-tshirt" }] },
  { title: "Levis 511 Slim Jeans Size 32", type: "sell", askingPrice: 900, category: "Clothes", condition: "used", conditionDescription: "Light fading, no tears", itemAge: "1 year", description: "Classic slim fit jeans.", photos: [{ url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", publicId: "levis-jeans" }] },
  { title: "Woodland Winter Jacket Size M", type: "sell", askingPrice: 1200, category: "Clothes", condition: "like_new", conditionDescription: "Worn 3 times, zipper perfect", itemAge: "6 months", description: "Warm winter jacket.", photos: [{ url: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400", publicId: "woodland-jacket" }] },
  { title: "Formal Shirt Set of 3", type: "sell", askingPrice: 600, category: "Clothes", condition: "used", conditionDescription: "All buttons intact, size M", itemAge: "1 year", description: "3 shirts for interviews.", photos: [{ url: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400", publicId: "formal-shirts" }] },
  { title: "Puma Sports Shorts Size L", type: "sell", askingPrice: 350, category: "Clothes", condition: "like_new", conditionDescription: "Elastic perfect, no fading", itemAge: "4 months", description: "Comfortable sports shorts.", photos: [{ url: "https://images.unsplash.com/photo-1539186607619-df476afe6ff1?w=400", publicId: "puma-shorts" }] },
  { title: "Ethnic Kurta Set XL", type: "sell", askingPrice: 700, category: "Clothes", condition: "like_new", conditionDescription: "Worn once, dry cleaned", itemAge: "2 months", description: "Perfect for college festivals.", photos: [{ url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400", publicId: "kurta-set" }] },
  { title: "Prestige Electric Kettle 1.5L", type: "sell", askingPrice: 550, category: "Kitchenware", condition: "used", conditionDescription: "Heats perfectly, minor limescale", itemAge: "1 year", description: "Essential for hostel room.", photos: [{ url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400", publicId: "kettle" }] },
  { title: "Philips Induction Cooktop", type: "sell", askingPrice: 1200, category: "Kitchenware", condition: "like_new", conditionDescription: "All modes work, glass scratch-free", itemAge: "8 months", description: "2000W induction cooktop.", photos: [{ url: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400", publicId: "induction" }] },
  { title: "Steel Tiffin Box 3 Layer", type: "sell", askingPrice: 280, category: "Kitchenware", condition: "used", conditionDescription: "All clips work, minor dent", itemAge: "1.5 years", description: "Leak-proof steel tiffin.", photos: [{ url: "https://images.unsplash.com/photo-1567306301408-9b74779a11af?w=400", publicId: "tiffin" }] },
  { title: "Bajaj Rice Cooker 1L", type: "rent", rentRates: { daily: 20, weekly: 120, monthly: 440 }, category: "Kitchenware", condition: "used", conditionDescription: "Works perfectly, non-stick intact", itemAge: "2 years", description: "Cook rice in hostel room.", photos: [{ url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", publicId: "rice-cooker" }] },
  { title: "Morphy Richards Coffee Maker", type: "sell", askingPrice: 1800, category: "Kitchenware", condition: "like_new", conditionDescription: "Used 20 times, all parts included", itemAge: "1 year", description: "For late night study sessions.", photos: [{ url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400", publicId: "coffee-maker" }] },
  { title: "Cosco Football Size 5", type: "sell", askingPrice: 380, category: "Sports gear", condition: "used", conditionDescription: "Good grip, holds air well", itemAge: "1 year", description: "Standard size 5 football.", photos: [{ url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400", publicId: "football" }] },
  { title: "Yonex Badminton Racket Set", type: "sell", askingPrice: 850, category: "Sports gear", condition: "like_new", conditionDescription: "Strings tight, bag included", itemAge: "6 months", description: "Set of 2 rackets with bag.", photos: [{ url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400", publicId: "badminton" }] },
  { title: "Nivia Yoga Mat 6mm", type: "sell", askingPrice: 400, category: "Sports gear", condition: "like_new", conditionDescription: "Non-slip surface intact", itemAge: "4 months", description: "Thick 6mm yoga mat.", photos: [{ url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400", publicId: "yoga-mat" }] },
  { title: "SG Cricket Kit Full Set", type: "rent", rentRates: { daily: 100, weekly: 600, monthly: 2200 }, category: "Sports gear", condition: "used", conditionDescription: "Bat good, pads slight wear", itemAge: "2 years", description: "Complete cricket kit.", photos: [{ url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400", publicId: "cricket-kit" }] },
  { title: "Gym Dumbbells 5kg Pair", type: "sell", askingPrice: 700, category: "Sports gear", condition: "used", conditionDescription: "Rubber grip fine, slight paint wear", itemAge: "1.5 years", description: "5kg rubber dumbbell pair.", photos: [{ url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400", publicId: "dumbbells" }] },
  { title: "Table Tennis Bat Set", type: "sell", askingPrice: 500, category: "Sports gear", condition: "like_new", conditionDescription: "Rubber intact, bag included", itemAge: "5 months", description: "2 TT bats with 6 balls.", photos: [{ url: "https://images.unsplash.com/photo-1611251135345-18c56206b863?w=400", publicId: "tt-bat" }] }
];

async function seed() {
  await connectDB();
  let owner = await User.findOne({ email: "seed.owner@raa.local" }).select("+password");
  if (!owner) owner = new User({ email: "seed.owner@raa.local" });
  owner.name = "Seed Owner";
  owner.password = owner.password || "Password@123";
  owner.userType = "local";
  owner.locationText = "Kolhapur";
  owner.location = { type: "Point", coordinates: [BASE_LNG, BASE_LAT] };
  owner.isEmailVerified = true;
  owner.rating = { average: 4.7, count: 34 };
  await owner.save();

  let testUser = await User.findOne({ email: "test@gmail.com" }).select("+password");
  if (!testUser) testUser = new User({ email: "test@gmail.com" });
  testUser.name = "Test User";
  testUser.password = "test1234";
  testUser.userType = "local";
  testUser.locationText = "Kolhapur";
  testUser.location = { type: "Point", coordinates: [BASE_LNG, BASE_LAT] };
  testUser.isEmailVerified = true;
  testUser.rating = { average: 4.9, count: 12 };
  await testUser.save();

  await Listing.deleteMany({});
  const payload = listings.map((item) => ({
    ...item,
    owner: owner._id,
    description: ensureDescription(item),
    photos: buildPhotoSet(item),
    location: { type: "Point", coordinates: [randomCoord(BASE_LNG), randomCoord(BASE_LAT)], address: "Kolhapur campus area" },
    status: "active",
    moderation: { isFlagged: false, reasons: [], state: "live" }
  }));
  await Listing.insertMany(payload);
  console.log(`Seeded ${payload.length} listings near Kolhapur.`);
  console.log("Test login: test@gmail.com / test1234");
  process.exit(0);
}

if (process.env.RUN_SEED === "true") {
  seed().catch((error) => {
    console.error("Seeding failed");
    console.error(error);
    process.exit(1);
  });
} else {
  console.log("Seed script disabled. Set RUN_SEED=true to seed demo listings.");
}
