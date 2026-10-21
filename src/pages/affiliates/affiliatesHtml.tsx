import type { JSX } from "react";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { AffiliatesContent } from "./affiliatesContent";

export interface IAffiliatesHtmlProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function AffiliatesHtml(props: IAffiliatesHtmlProps): JSX.Element {
  const { client, ...data } = props;

  return (
    <Page
      isLoggedIn={!!props.account}
      css={["affiliates"]}
      js={["affiliates"]}
      maxWidth={1200}
      title="Affiliate Program | beBEAR"
      ogTitle="Affiliate Program | beBEAR"
      canonical="https://www.liftosaur.com/affiliates"
      description="beBEAR's affiliate program - earn money by referring paid users to beBEAR"
      ogUrl="https://www.liftosaur.com/affiliates"
      data={data}
      client={client}
    >
      <AffiliatesContent client={client} {...data} />
    </Page>
  );
}
