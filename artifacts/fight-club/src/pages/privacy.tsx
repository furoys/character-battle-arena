export function Privacy() {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "#030308",
        color: "rgba(255,255,255,0.85)",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "32px 20px 64px",
        maxWidth: 680,
        margin: "0 auto",
        lineHeight: 1.7,
        fontSize: 14,
      }}
    >
      <a
        href="/"
        style={{
          display: "inline-block",
          marginBottom: 32,
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.35)",
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        ← Back to A.v.A
      </a>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#ff0055",
          marginBottom: 4,
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 40, letterSpacing: "0.1em" }}>
        A.v.A — Anyone vs Anyone · Last updated: April 2026
      </p>

      <Section title="Overview">
        A.v.A ("the App") is an AI-powered character fight simulator. This policy explains what
        information we collect, how we use it, and your rights. Use of the App is optional and
        most features are available without creating an account.
      </Section>

      <Section title="Information We Collect">
        <strong style={{ color: "#fff" }}>Account information (optional)</strong>
        <br />
        If you choose to create an account, we collect your email address and, optionally, your
        name and profile username through our authentication provider (Clerk). You may also sign
        in via Google, in which case Google shares your name and email address with us.
        <br /><br />
        <strong style={{ color: "#fff" }}>Usage data</strong>
        <br />
        When you run fights, we store the characters selected and the AI-generated fight result.
        Signed-in users can view their own fight history in their profile. Anonymous fights are
        not linked to any identity.
        <br /><br />
        <strong style={{ color: "#fff" }}>Age preference</strong>
        <br />
        We store a local preference (on your device only) indicating whether you have confirmed
        you are 16 or older, used solely to decide whether to display mature language in fight
        narratives.
        <br /><br />
        <strong style={{ color: "#fff" }}>Device & technical data</strong>
        <br />
        Standard server logs may include your IP address, browser type, and pages visited. These
        are used for security and performance monitoring only and are not sold or shared.
      </Section>

      <Section title="How We Use Your Information">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>To provide and improve the App's features</li>
          <li>To store your fight history and profile settings (username, character avatar)</li>
          <li>To authenticate you securely across sessions and devices</li>
          <li>To monitor for abuse and maintain service reliability</li>
        </ul>
        <br />
        We do <strong style={{ color: "#fff" }}>not</strong> sell your data, serve ads, or use
        your data for any purpose unrelated to operating this App.
      </Section>

      <Section title="Third-Party Services">
        The App uses the following third-party services, each with their own privacy policies:
        <br /><br />
        <strong style={{ color: "#fff" }}>Clerk</strong> (clerk.com) — handles authentication,
        account storage, and session management.
        <br /><br />
        <strong style={{ color: "#fff" }}>Anthropic / OpenAI</strong> — generates the AI fight
        narratives. Fight prompts (character names and context) are sent to their API. We do not
        send any personal account information to AI providers.
        <br /><br />
        <strong style={{ color: "#fff" }}>Google Fonts</strong> — fonts are loaded from Google's
        CDN. This may log your IP address per Google's standard practices.
      </Section>

      <Section title="Data Retention">
        Account data is retained until you delete your account. Fight history is retained
        indefinitely to power your profile stats, but can be deleted on request. If you delete
        your account, all associated personal data is removed within 30 days.
      </Section>

      <Section title="Children's Privacy">
        The App contains stylized fantasy violence and strong language. It is not directed at
        children under 13. We do not knowingly collect personal information from anyone under 13.
        If you believe a child has provided us with personal data, contact us and we will delete
        it promptly.
      </Section>

      <Section title="Your Rights">
        Depending on your location, you may have the right to access, correct, or delete your
        personal data, and to withdraw consent. To exercise these rights, contact us at the
        address below or delete your account directly from the Profile page.
      </Section>

      <Section title="Security">
        All data is transmitted over HTTPS. Authentication is managed by Clerk, which uses
        industry-standard security practices. No system is 100% secure — please use a strong,
        unique password for your account.
      </Section>

      <Section title="Changes to This Policy">
        We may update this policy from time to time. Significant changes will be noted with an
        updated date at the top of this page. Continued use of the App after changes constitutes
        acceptance of the revised policy.
      </Section>

      <Section title="Contact">
        For any privacy questions or data requests:
        <br /><br />
        <span style={{ color: "#00f0ff" }}>furoys@gmail.com</span>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "#ff0055",
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: "1px solid rgba(255,0,85,0.2)",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "rgba(255,255,255,0.7)" }}>{children}</div>
    </div>
  );
}
