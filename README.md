# quasagram-clone-backend

## dev - troubleshoot
Remove the process listening on port 3000
```
kill -9 $(lsof -t -i :3000)
```
## push notification subscription
### generate key
```
npm run web-push generate-vapid-keys
```

### send push notification
```
npm run web-push send-notification
```
