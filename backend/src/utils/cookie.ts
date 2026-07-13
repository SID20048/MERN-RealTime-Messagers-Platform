import { Response } from "express";


export const setCookie = (
  res: Response,
  token: string
) => {

  return res.cookie(
    "accessToken",
    token,
    {
      httpOnly: true,

      secure: true,

      sameSite: "none",

      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,

      path:"/",
    }
  );

};

export const setJwtAuthCookie = ({
  res,
  userId,
}: {
  res: Response;
  userId: string;
}) => {
  const token = userId;
  return setCookie(res, token);
};

export const clearJwtAuthCookie = (res: Response) => {
  return res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
};