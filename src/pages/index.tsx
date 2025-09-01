// src/pages/index.tsx (New "About" Page - without <a> inside <Link>)
import Link from 'next/link';
 
export default function AboutPage() {
  
  return (
    <div style={{ fontFamily: 'Kalam, cursive, sans-serif', padding: '0 20px 20px 20px', textAlign: 'center', backgroundColor: '#fffbef' }}>
      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        <section style={{ marginBottom: '50px', padding: '25px', backgroundColor: '#fffde7', boxShadow: '3px 3px 8px rgba(0,0,0,0.1)', borderRadius: '5px' }}>
          <h2 style={{ fontSize: '2.8em', color: '#c79100', marginBottom: '20px', fontFamily: 'Patrick Hand, cursive' }}>
            Welcome to EasySignUpz!
          </h2>
          <p style={{ fontSize: '1.3em', lineHeight: '1.7', color: '#5d4037' }}>
            Your central hub for organizing and participating in local events, volunteer opportunities, and group activities.
            Whether you&apos;re looking to make a difference volunteering, coordinate a neighborhood potluck, or schedule shifts for a school function, EasySignupz makes bringing people together simple.
          </p>
        </section>

        <section style={{ marginBottom: '50px', padding: '25px', backgroundColor: '#fff9c4', boxShadow: '3px 3px 8px rgba(0,0,0,0.1)', borderRadius: '5px' }}>
          <h3 style={{ fontSize: '2em', color: '#c79100', marginBottom: '15px', fontFamily: 'Patrick Hand, cursive' }}>What We Do</h3>
          <p style={{ lineHeight: '1.7', color: '#5d4037', fontSize: '1.1em' }}>
            We bridge the gap between organizers and participants for any occasion. 
            Our platform connects anyone—from non-profits and schools to local clubs and individuals—with an engaged community here in Pottstown.
            Browse a variety of upcoming signups, reserve your spot with a click, and manage all your commitments in one convenient place.
             Organizers can effortlessly post their needs—from volunteer slots and event RSVPs to potluck items—and connect with a vibrant community ready to participate and contribute.
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
            Explore Events
          </Link>
        </section>
      </main>

      
    </div>
  );
}