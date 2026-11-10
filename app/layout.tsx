import './globals.css'

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
    >
      <body className=" flex flex-col">{children}</body>
    </html>
  );
}
