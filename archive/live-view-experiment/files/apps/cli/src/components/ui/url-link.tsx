import { Text } from "ink";
import Link from "ink-link";

interface UrlLinkProps {
  url: string;
  label?: string;
}

export const UrlLink = ({ url, label }: UrlLinkProps) => (
  <Link url={url}>
    <Text>{label ?? url}</Text>
  </Link>
);
