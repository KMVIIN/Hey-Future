# Future Admin setup

Admin dashboard: `/admin`

Set this Vercel environment variable to the owner/admin email(s):

```
ADMIN_EMAILS=owner@example.com,second-admin@example.com
```

Only authenticated users whose email appears in `ADMIN_EMAILS` can open the admin dashboard.

The admin dashboard shows:
- customer count
- current plan and subscription status
- monthly AI message usage
- monthly web research usage
- estimated OpenAI cost
- subscription list-price revenue
- approximate contribution margin
- plan/feature matrix for Free, Personal, Pro and Business

Customer feature summary:
- Free: no-login guest basics, local tasks/calendar/notes, limited AI/web, Lavender/Dark/Sky themes
- Personal €9.99: cloud/connected services, 100 web researches/month, paid customization and uploaded backgrounds
- Pro €19.99: higher AI usage, 300 web researches/month, advanced workflows/customization
- Business €39.99/user: 1,000 web researches/month, high AI limits, business workflows and admin visibility
