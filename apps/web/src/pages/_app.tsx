import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Luckiest_Guy, Paytone_One, Nunito } from 'next/font/google';

// Define fonts for BabelGopher kitsch theme
const luckiestGuy = Luckiest_Guy({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-luckiest-guy',
  display: 'swap',
});

const paytoneOne = Paytone_One({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-paytone-one',
  display: 'swap',
});

const nunito = Nunito({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'optional',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${luckiestGuy.variable} ${paytoneOne.variable} ${nunito.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
