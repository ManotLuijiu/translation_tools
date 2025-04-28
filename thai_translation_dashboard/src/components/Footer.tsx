import { Separator } from '@/components/ui/separator';

const Footer = () => {
  return (
    <footer className="w-full mt-10">
      <Separator />
      <div className="flex flex-col md:flex-row justify-between items-center p-6 text-sm text-muted-foreground">
        <div>
          © {new Date().getFullYear()}{' '}
          <a
            href="https://moo-ai.online"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            MooCoding
          </a>
        </div>
        {/* <div className="mt-4 md:mt-0 flex gap-4">
          <a href="/privacy" className="hover:underline hover:text-primary">
            Privacy
          </a>
          <a href="/terms" className="hover:underline hover:text-primary">
            Terms
          </a>
          <a href="/contact" className="hover:underline hover:text-primary">
            Contact
          </a>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;
