import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const ANIMALS = ["wolf", "hawk", "bear", "shark"];

const STORAGE_KEY = "chat_username";

const generateUsername = () => {
  const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];

  return `anonymous-${word}-${nanoid(5)}`;
};

export const useUsername = () => {
  const [userName, setuserName] = useState("John");

  useEffect(() => {
    const main = () => {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        setuserName(stored);

        return;
      }
      const generated = generateUsername();

      localStorage.setItem(STORAGE_KEY, generated);
      setuserName(generated);
    };
    main();
  }, []);

  return { userName };
};
