import { IsString } from 'class-validator';

export class ShopifyCallbackDto {
  @IsString()
  shop: string;

  @IsString()
  code: string;

  @IsString()
  state: string;

  @IsString()
  hmac: string;
}
