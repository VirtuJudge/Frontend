import { Wrapper, Text, Button } from "@/components";
import Image from "next/image";

export function Footer() {
	return <footer className="px-5 mt-20">
		<Wrapper as="div" className="m-auto w-full max-w-7xl p-10 flex flex-col lg:flex-row justify-between items-start gap-10">
			<Image
				src="/logos/logo-primary.webp"
				alt="VirtuJudge Logo"
				width={671}
				height={304}
				priority
				className="w-40 h-auto"
			/>
			<div className="flex flex-col gap-2">
				<Text as="b" size="body" className="opacity-80">Quick access</Text>
				<Text as="a" size="body" href="/home">Home</Text>
				<Text as="a" size="body" href="/pricing">Pricing</Text>
			</div>
			<div className="flex flex-col gap-2">
				<Text as="b" size="body" className="opacity-60">Company</Text>
				<Text as="a" size="body" href="/company/data-privacy">Data privacy</Text>
				<Text as="a" size="body" href="/company/terms">Terms and conditions</Text>
				<Text as="a" size="body" href="/company/contact-us">Contact us</Text>
			</div>
			<Button variant="primary" href="/" className="w-full lg:w-auto">  
				Try now!
			</Button>
		</Wrapper>
		<Text as="p" size="caption" className="text-center text-fg/70 my-2">
			@{new Date().getFullYear()} VirtuJudge. All rights reserved.
		</Text>
	</footer>
}