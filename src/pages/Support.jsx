import { Link } from 'react-router-dom';

const supportEmail = 'covrekiko@hotmail.com';

const sections = [
  {
    title: '1. Contact Support',
    content: (
      <p>
        If you need help using the app, have found a bug, or need assistance with your account, email us at{' '}
        <a href={`mailto:${supportEmail}`} className="font-semibold text-primary hover:underline">
          {supportEmail}
        </a>.
      </p>
    ),
  },
  {
    title: '2. Account Deletion Requests',
    content: (
      <p>
        If you want to delete your account or personal data, you can use the Delete Account option inside the app profile/settings page. If you need help, contact support at{' '}
        <a href={`mailto:${supportEmail}`} className="font-semibold text-primary hover:underline">
          {supportEmail}
        </a>.
      </p>
    ),
  },
  {
    title: '3. Privacy and Data',
    content: 'We only use app data to provide record keeping, inventory, reports, and app features. Do not include private certificate details or sensitive information in support emails unless necessary.',
  },
  {
    title: '4. App Information',
    content: 'Shooting Records is a record keeping app for lawful sporting, clay shooting, target shooting, deer management, ammunition inventory, reloading records, armory tracking, and PDF reports.',
  },
  {
    title: '5. Disclaimer',
    content: 'Shooting Records does not provide legal advice, firearm training, ammunition manufacturing instructions, or load data. Users are responsible for following all laws, licences, permissions, safety rules, and range rules in their location.',
  },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <Link to="/" className="inline-flex text-sm font-medium text-primary hover:underline mb-8">
          ← Back to Shooting Records
        </Link>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-8">
          <p className="text-sm font-semibold text-primary mb-2">Support</p>
          <h1 className="text-3xl font-bold mb-4">Shooting Records Support</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            Help, account support, bug reports, and app enquiries.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            For help with Shooting Records, bug reports, account deletion requests, or general app support, please contact us.
          </p>

          <div className="rounded-xl bg-secondary/60 border border-border p-4 mb-8">
            <p className="text-sm font-semibold text-foreground mb-1">Contact email</p>
            <a href={`mailto:${supportEmail}`} className="text-primary font-semibold hover:underline break-all">
              {supportEmail}
            </a>
          </div>

          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                <div className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {typeof section.content === 'string' ? <p>{section.content}</p> : section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}