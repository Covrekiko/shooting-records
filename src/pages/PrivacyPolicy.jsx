import { Link, useLocation } from 'react-router-dom';

const sections = [
  {
    title: '1. Information We Collect',
    content: [
      'Depending on how the user uses the app, Shooting Records may collect or store account and profile information including name, email address, phone number, date of birth, address, and profile details entered by the user.',
      'The app may store shooting and firearm record information including target shooting records, clay shooting records, deer management and stalking records, firearm details, ammunition stock records, reloading component and batch records, firearm cleaning and maintenance history, and notes entered by the user.',
      'The app may store document and certificate information if entered or uploaded by the user, including firearm certificates, shotgun certificates, shooting insurance details, deer stalking or training certificates such as DSC1, PDS1, PDS2, or similar documents.',
      'The app may store location and map information including stalking map areas, land boundaries, points of interest, high seats, check-in and check-out locations, GPS track information during an outing if enabled, and live location sharing only when the user chooses to enable it for a shared area or client outing.',
      'The app may store photos and media including target photos, deer/cull photos, point of interest photos, high seat or land photos, and other photos uploaded or taken by the user inside the app.',
      'The app may collect basic technical information required to operate the app, app usage and diagnostic information, and crash or error information if supported by the hosting/app platform.'
    ]
  },
  {
    title: '2. How We Use Information',
    content: [
      'We use user information to create and manage user accounts, store shooting, stalking, firearm, ammunition, reloading, and maintenance records, generate records and reports including PDF reports, display maps, boundaries, points of interest, high seats, and outing locations, support check-in, check-out, and GPS tracking features, support optional area sharing and client logs, allow users to share outing information with an area owner only when the user chooses to do so, improve app reliability, security, and performance, and provide support and troubleshoot problems.'
    ]
  },
  {
    title: '3. Location Data',
    content: [
      'Shooting Records may use location data for map and outing features.',
      'Location data may be used to show the user’s current position on the stalking map, save check-in and check-out locations, record GPS tracks during an outing, mark points of interest or harvest locations, and share live location with an area owner only if the user chooses to enable live sharing for a shared area.',
      'Live location sharing is optional. The app should only share live location with another user when the user has accepted a shared area and chooses to share live tracking during an active outing.'
    ]
  },
  {
    title: '4. Area Sharing and Client Logs',
    content: [
      'The app may allow a user to share a land area with another user using a share link.',
      'When an area is shared, the invited user may receive access to the selected boundary and selected shared map points only. Private records, private notes, private photos, private GPS tracks, and unselected points of interest should not be shared automatically.',
      'The invited user may choose whether to share outing information back to the area owner. If the invited user enables live tracking, the area owner may view the invited user’s live location only during the active check-in period. When the outing ends, live tracking stops.'
    ]
  },
  {
    title: '5. How Information Is Stored',
    content: [
      'Information may be stored locally on the user’s device and/or securely on app hosting, database, and storage services used to operate the app.',
      'Some app data may be cached locally to support offline use. Offline data may sync when internet access is restored.'
    ]
  },
  {
    title: '6. Sharing of Information',
    content: [
      'We do not sell user personal information.',
      'User information may be shared when the user chooses to share information, such as sharing an outing with an area owner; with service providers required to operate the app, such as hosting, database, file storage, authentication, mapping, analytics, or error logging providers; if required by law, regulation, legal process, or public authority request; or to protect the safety, security, or integrity of the app and its users.'
    ]
  },
  {
    title: '7. Third-Party Services',
    content: [
      'Shooting Records may use third-party services for hosting, authentication, storage, maps, analytics, and app operation. These services may process limited data required to provide their functionality.',
      'Examples may include app hosting/platform services, database and file storage services, map services, authentication services, and analytics or diagnostic services.'
    ]
  },
  {
    title: '8. User Choices and Control',
    content: [
      'Users may edit or update their profile information, add, edit, or delete records where the app supports it, choose whether to enable location access, choose whether to share live location during a shared outing, choose whether to share outing information with an area owner, and request account deletion or data deletion.'
    ]
  },
  {
    title: '9. Account and Data Deletion',
    content: [
      'Users can delete their account directly in the app from Profile → Account Management → Delete Account. Users may also contact covrekiko@icloud.com for privacy or deletion support.',
      'Some information may be retained if required for legal, security, fraud prevention, backup, or compliance reasons.'
    ]
  },
  {
    title: '10. Data Security',
    content: [
      'We use reasonable technical and organisational measures to protect user information. However, no system is completely secure, and users should avoid uploading or entering information they do not want stored in the app.'
    ]
  },
  {
    title: '11. Children',
    content: [
      'Shooting Records is not intended for children. The app is intended for lawful adult users who are permitted to participate in shooting, stalking, firearm, or countryside management activities in their jurisdiction.'
    ]
  },
  {
    title: '12. International Users',
    content: [
      'User information may be processed and stored in countries other than the user’s country of residence, depending on the hosting and service providers used by the app.'
    ]
  },
  {
    title: '13. Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. The updated version will be posted with a new effective date.'
    ]
  },
  {
    title: '14. Contact',
    content: [
      'For privacy questions, support, or data deletion requests, contact Shooting Records at covrekiko@icloud.com.'
    ]
  }
];

export default function PrivacyPolicy() {
  const location = useLocation();
  const fromProfile = location.state?.from === 'profile';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <Link to={fromProfile ? '/profile' : '/'} className="inline-flex text-sm font-medium text-primary hover:underline mb-8">
          ← {fromProfile ? 'Back to Profile' : 'Back to Shooting Records'}
        </Link>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8">
          <p className="text-sm font-semibold text-primary mb-2">Effective date: 3 May 2026</p>
          <h1 className="text-3xl font-bold mb-4">Privacy Policy for Shooting Records</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Shooting Records (“the app”, “we”, “our”, or “us”) is a shooting, stalking, firearm maintenance, ammunition inventory, reloading, mapping, and record keeping application. This Privacy Policy explains what information may be collected, how it is used, and what choices users have.
          </p>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                <div className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {section.content.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}