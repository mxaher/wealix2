# Cloudflare WAF Custom Rules for Wealix.app

The following rules should be configured in **Cloudflare Security → WAF → Custom Rules** to block malicious scanner traffic before it reaches the Worker.

## Rule 1: Block WordPress and CMS Scanners
- **Expression**: 
  ```text
  (http.request.uri.path contains "/wp-admin") or
  (http.request.uri.path contains "/wp-login") or
  (http.request.uri.path contains "/xmlrpc.php") or
  (http.request.uri.path contains "/wp-content") or
  (http.request.uri.path contains "/wp-includes")
  ```
- **Action**: Block

## Rule 2: Block Sensitive File Access
- **Expression**: 
  ```text
  (http.request.uri.path contains "/.env") or
  (http.request.uri.path contains "/.git") or
  (http.request.uri.path contains "/phpmyadmin") or
  (http.request.uri.path contains "/config.php") or
  (http.request.uri.path contains "/setup-config.php")
  ```
- **Action**: Block

## Rule 3: Block Self-Referencing User Agents
- **Expression**: 
  ```text
  (http.user_agent contains "wealix.app/wp-admin")
  ```
- **Action**: Block
