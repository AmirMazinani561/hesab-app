import Link from "next/link";
import { currentUser, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PayrollPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/equity"); // Redirect to existing login screen
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
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    backBtn: {
      backgroundColor: "#21262d",
      color: "#c9d1d9",
      border: "1px solid #30363d",
      padding: "6px 12px",
      borderRadius: "6px",
      textDecoration: "none",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "0.2s",
    },
    title: {
      fontSize: "20px",
      fontWeight: "bold",
      color: "#c9d1d9",
      margin: 0,
      paddingRight: "16px",
      borderRight: "1px solid #30363d",
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
      maxWidth: "1000px",
      margin: "40px auto",
      padding: "0 24px",
    },
    dashboardBlank: {
      backgroundColor: "#161b22",
      border: "1px solid #30363d",
      borderRadius: "12px",
      padding: "80px 24px",
      textAlign: "center" as const,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      minHeight: "400px",
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
    h2: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#fff",
      marginBottom: "16px",
    },
    p: {
      fontSize: "16px",
      color: "#8b949e",
      lineHeight: 1.8,
      maxWidth: "500px",
      margin: "0 auto",
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backBtn} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#30363d'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#21262d'}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            بازگشت به هاب
          </Link>
          <h1 style={styles.title}>ماژول حقوق و دستمزد</h1>
        </div>
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
        <div style={styles.dashboardBlank}>
          <div style={styles.iconWrap}>
            <svg width="40" height="40" fill="none" stroke="#8b949e" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 style={styles.h2}>به زودی...</h2>
          <p style={styles.p}>
            ساختار پایه ماژول حقوق و دستمزد آماده شده است. فرم‌ها، جداول و امکانات مربوط به مدیریت پرسنل و کارکرد به زودی در این قسمت پیاده‌سازی خواهند شد.
          </p>
        </div>
      </main>
    </div>
  );
}
