// Isolated account-component checks with the existing installed flat Next config.
// The HostGator branch's historical default config targets a different version.
import next from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';
export default [...next,...typescript,{
  // Preserve visibility of three pre-existing legacy effect diagnostics without
  // rewriting transaction UI. Same review policy as the separate website PR #2.
  files:['components/admin/AdminPanel.tsx'],
  rules:{'react-hooks/set-state-in-effect':'warn'}
}];
