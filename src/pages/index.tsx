// src/pages/index.tsx (New "About" Page - without <a> inside <Link>)
import Link from 'next/link';
 
export default function AboutPage() {
  
  return (
    <div style={{ fontFamily: 'Kalam, cursive, sans-serif', padding: '0 20px 20px 20px', textAlign: 'center', backgroundColor: '#fffbef' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        <section style={{ marginBottom: '50px', padding: '25px', backgroundColor: '#fffde7', boxShadow: '3px 3px 8px rgba(0,0,0,0.1)', borderRadius: '5px' }}>
          <h2 style={{ fontSize: '2.8em', color: '#c79100', marginBottom: '20px', fontFamily: 'Patrick Hand, cursive' }}>
            Welcome to VolunteerConnect!
          </h2>
          <p style={{ fontSize: '1.3em', lineHeight: '1.7', color: '#5d4037' }}>
            Your central hub for discovering and participating in volunteer opportunities right here in Stowe, PA, and our surrounding community.
            Whether you're looking to lend a hand, meet new people, or make a tangible difference, VolunteerConnect makes it simple and enjoyable.
          </p>
        </section>

        <section style={{ marginBottom: '50px', padding: '25px', backgroundColor: '#fff9c4', boxShadow: '3px 3px 8px rgba(0,0,0,0.1)', borderRadius: '5px' }}>
          <h3 style={{ fontSize: '2em', color: '#c79100', marginBottom: '15px', fontFamily: 'Patrick Hand, cursive' }}>What We Do</h3>
          <p style={{ lineHeight: '1.7', color: '#5d4037', fontSize: '1.1em' }}>
            We bridge the gap between passionate volunteers and the organizations or individuals hosting local events.
            Browse a variety of upcoming activities, sign up with just a click, and easily manage your commitments—all in one convenient place.
            Event creators can effortlessly post their needs and connect with a vibrant audience of willing helpers ready to contribute.
          </p>
        </section>

        <section style={{ paddingBottom: '30px' }}>
          <h3 style={{ fontSize: '2em', color: '#c79100', marginBottom: '25px', fontFamily: 'Patrick Hand, cursive' }}>Ready to Make an Impact?</h3>
          <Link
            href="/events"
            style={{
              display: 'inline-block',
              padding: '15px 30px',
              backgroundColor: '#fdd835', // Brighter yellow for prominent CTA
              color: '#5d4037', // Darker text for readability
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              fontSize: '1.3em',
              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              fontFamily: 'Kalam, cursive'
            }}
            // To add hover effects with inline styles is tricky without JS/CSS-in-JS.
            // For hover, you'd typically use CSS classes.
            // If using a global CSS for .button-link-cta:
            // className="button-link-cta"
          >
            Explore Volunteer Events
          </Link>
        </section>
      </main>

      
    </div>
  );
}