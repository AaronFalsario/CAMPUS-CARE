import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    writeBundle() {
      const filesToCopy = [
        { src: 'bottom-nav.js', dest: 'dist/bottom-nav.js' },
      ];
      
      filesToCopy.forEach(({ src, dest }) => {
        if (existsSync(src)) {
          const destDir = dirname(dest);
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          copyFileSync(src, dest);
          console.log(`✓ Copied ${src} to ${dest}`);
        } else {
          console.log(`⚠️ File not found: ${src}`);
        }
      });
    }
  }
}

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'Assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // REMOVED the leading slash - it was the problem
        loading: resolve(__dirname, 'Assets/landing_page/LOADING PAGE/index.html'),
        landing: resolve(__dirname, 'land.html'),
        studentDashboard: resolve(__dirname, 'Assets/Student_dashboard/SDB.html'),
        adminDashboard: resolve(__dirname, 'Assets/Admin_dashboard/Admin.html'),
        adminLogin: resolve(__dirname, 'Assets/login/admin/admin.html'),
        studentLogin: resolve(__dirname, 'Assets/login/log.html'),
        reportPage: resolve(__dirname, 'Assets/Student_reporting/report.html'),
        adminIncidents: resolve(__dirname, 'Assets/Admin_dashboard/incident/incident.html'),
        adminUsers: resolve(__dirname, 'Assets/Admin_dashboard/user_page/user.html'),
        adminSettings: resolve(__dirname, 'Assets/Admin_dashboard/settings/setting.html'),
        studentSettings: resolve(__dirname, 'Assets/Student_dashboard/setting/setting.html'),
        adminAnalytics: resolve(__dirname, 'Assets/Admin_dashboard/analytics/analytics.html'),
        resetPassword: resolve(__dirname, 'Assets/login/password_admin/reset_password.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  publicDir: 'public',
  plugins: [copyStaticFiles()]
})