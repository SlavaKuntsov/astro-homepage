import '../../styles/global.css';
import {
	Carousel as CarouselComponent,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import Autoplay from 'embla-carousel-autoplay';

export function Carousel() {
	const isMobile = useIsMobile();
	return (
		<CarouselComponent
			className='w-full max-w-xs'
			opts={{
				loop: true,
			}}
			plugins={[
				Autoplay({
					delay: 4000,
				}),
			]}
		>
			<CarouselContent>
				{Array.from({ length: 6 }).map((_, index) => (
					<CarouselItem key={index}>
						<div
							className='min-h-[250px] bg-transparent flex items-center justify-center w-full bg-center bg-cover shadow-none'
							style={{
								backgroundImage: `url(/images/arts2/art${index + 1}.png)`,
							}}
							aria-label={`Art ${index + 1}`}
							role='img'
						/>
					</CarouselItem>
				))}
			</CarouselContent>
			{!isMobile && (
				<>
					<CarouselPrevious className='bg-white/75 hover:bg-orange-300 transition-colors duration-500' />
					<CarouselNext className='bg-white/75 hover:bg-orange-300 transition-colors duration-500' />
				</>
			)}
		</CarouselComponent>
	);
}
