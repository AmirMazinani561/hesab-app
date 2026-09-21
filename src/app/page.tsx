import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HubPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/equity");
  }

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "Vazirmatn, sans-serif",
      direction: "rtl" as const,
      margin: 0,
      padding: 0,
    },
    header: {
      backgroundColor: "#161b22",
      borderBottom: "1px solid #30363d",
      padding: "16px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#c9d1d9",
      margin: 0,
    },
    userInfo: {
      display: "flex",
      gap: "16px",
      alignItems: "center",
    },
    logoutBtn: {
      backgroundColor: "#da3633",
      color: "#fff",
      border: "none",
      padding: "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "14px",
    },
    main: {
      maxWidth: "900px",
      margin: "60px auto",
      padding: "0 24px",
    },
    h2: {
      textAlign: "center" as const,
      fontSize: "28px",
      marginBottom: "40px",
      color: "#fff",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "24px",
    },
    card: {
      backgroundColor: "#161b22",
      border: "1px solid #30363d",
      borderRadius: "12px",
      padding: "40px 24px",
      textAlign: "center" as const,
      textDecoration: "none",
      color: "#c9d1d9",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      transition: "all 0.2s ease-in-out",
      cursor: "pointer",
    },
    iconWrap: {
      width: "80px",
      height: "80px",
      backgroundColor: "#0d1117",
      border: "1px solid #30363d",
      borderRadius: "50%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: "24px",
    },
    cardTitle: {
      fontSize: "22px",
      fontWeight: "bold",
      color: "#fff",
      marginBottom: "12px",
    },
    cardDesc: {
      fontSize: "14px",
      color: "#8b949e",
      lineHeight: 1.6,
      margin: 0,
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>هاب مرکزی سیستم</h1>
        <div style={styles.userInfo}>
          <span style={{ fontSize: "14px", color: "#8b949e" }}>کاربر: {user.username}</span>
          <form action={async () => {
            "use server";
            await signOut();
            redirect("/equity");
          }}>
            <button type="submit" style={styles.logoutBtn}>
              خروج
            </button>
          </form>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.h2}>انتخاب ماژول</h2>
        
        <div style={styles.grid}>
          <Link href="/equity" style={{ textDecoration: "none" }}>
            <div style={styles.card} onMouseOver={(e) => e.currentTarget.style.borderColor = '#58a6ff'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#30363d'}>
              <div style={styles.iconWrap}>
                <svg width="40" height="40" fill="none" stroke="#58a6ff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 style={styles.cardTitle}>حساب سرمایه‌گذاران</h3>
              <p style={styles.cardDesc}>
                مدیریت آورده‌ها، برداشت‌ها و محاسبه سهم بر پایه وزن آلومینیوم.
              </p>
            </div>
          </Link>

          <Link href="/payroll" style={{ textDecoration: "none" }}>
            <div style={styles.card} onMouseOver={(e) => e.currentTarget.style.borderColor = '#3fb950'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#30363d'}>
              <div style={styles.iconWrap}>
                <svg width="40" height="40" fill="none" stroke="#3fb950" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 style={styles.cardTitle}>حقوق و دستمزد</h3>
              <p style={styles.cardDesc}>
                مدیریت پرسنل، کارکرد، مساعده، تسویه‌حساب و همگام‌سازی با کیف پول.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
