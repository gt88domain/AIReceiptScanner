import { motion } from "motion/react";
import { useEffect, useState } from "react";

export type ImageCard = {
  id: string;
  img: string;
  alt: string;
};

const ImageStack = ({ images: initialImages }: { images: ImageCard[] }) => {
  const [images, setImages] = useState<ImageCard[]>(initialImages);

  useEffect(() => {
    const interval = setInterval(() => {
      setImages((prevImages) => {
        const newArray = [...prevImages];

        const last = newArray.pop();
        if (last) {
          newArray.unshift(last);
        }

        return newArray;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-60.5">
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          className="absolute left-1/2 w-full -translate-x-1/2"
          style={{
            transformOrigin: "top center",
          }}
          animate={{
            top: (index - 2) * -10,
            scale: 1 - index * 0.05,
            opacity: 1 - index * 0.2,
            zIndex: images.length - index,
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
        >
          <img
            src={image.img}
            alt={image.alt}
            className="h-51.5 w-full rounded-md object-contain"
          />
        </motion.div>
      ))}
    </div>
  );
};

export default ImageStack;
