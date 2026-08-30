import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TimelineItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  upcoming?: boolean;

  @IsOptional()
  @IsBoolean()
  grey?: boolean;
}

export class TeamMemberDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class ClientInfoDto {
  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  opposingParty?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class DocumentItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  createdAt?: string;
}

export class CreateCaseDto {
  @IsOptional()
  @IsString()
  consultation_id?: string;

  @IsOptional()
  @IsString()
  lawfirm_id?: string;

  @IsOptional()
  @IsString()
  lawyer_id?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsString()
  @IsNotEmpty()
  cnr: string;

  @IsString()
  @IsNotEmpty()
  case_type: string;

  @IsString()
  @IsNotEmpty()
  brief_description: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  progress?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineItemDto)
  timeline?: TimelineItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents?: DocumentItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientInfoDto)
  client?: ClientInfoDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  team?: TeamMemberDto[];

  @IsOptional()
  @IsString()
  filed_date?: string;
}
