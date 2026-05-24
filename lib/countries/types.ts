export type CountryCodeFormat = "alpha2" | "alpha3";

export type Country = {
  name: string;
  alpha2: string;
  alpha3: string;
};

export type CountryOption = {
  code: string;
  name: string;
  alpha2: string;
  alpha3: string;
};
