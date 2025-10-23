import './globals.css'

export const metadata = {
  title: 'FoodDelivery - Order Food Online',
  description: 'Multi-tenant food delivery platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}