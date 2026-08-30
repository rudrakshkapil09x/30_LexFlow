import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { LawFirmResponseDto } from './dto';
import { UsersService } from '../users/users.service';

// ── Internal model ───────────────────────────────────────────────────────────
interface LawFirm {
  id: string;           // mirrors Firm.id from UsersService  e.g. 'firm-1'
  name: string;
  subtitle: string;
  description: string;
  location: string;        // filter key  e.g. 'mumbai'
  locationLabel: string;   // display label e.g. 'Mumbai, MH'
  practiceArea: string;    // filter key e.g. 'corporate'
  availability: string;    // 'AVAILABLE' | 'TODAY' | 'BUSY'
  rating: number;
  reviews: number;
  price: number;           // per hour in USD
  experience: string;
  bio: string;
  practiceAreas: string[];
  languages: string[];
  education: { school: string; degree: string }[];
  avatarColor: string;
  /** Optional rich contact fields pulled from UsersService Firm record */
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

// ── Query filter type ────────────────────────────────────────────────────────
export interface LawFirmFilters {
  keyword?: string;
  location?: string;
  practiceArea?: string;
  /** 'rating' | 'price_asc' | 'reviews' | 'availability' */
  sortBy?: string;
}

@Injectable()
export class LawFirmsService implements OnModuleInit {
  private firms: LawFirm[] = [];

  constructor(private readonly usersService: UsersService) {}

  /** Called by NestJS after all dependencies are resolved */
  onModuleInit(): void {
    this.seedData();
  }

  // ── Seed ──────────────────────────────────────────────────────────────────
  private seedData(): void {
    // ─── Hydrate real firms from UsersService ─────────────────────────────
    const realFirms = this.usersService.getAllFirms();

    const firmPracticeAreasMap: Record<string, string[]> = {
      'firm-1': [
        'Corporate Law',
        'Civil Litigation',
        'Commercial Arbitration',
        'Contract Disputes',
        'Constitutional Law',
      ],
      'firm-2': [
        'Intellectual Property',
        'Patent Prosecution',
        'Trademark Disputes',
        'Copyright Law',
        'Trade Secrets',
      ],
      'firm-3': [
        'Technology Law',
        'IT & SaaS Contracts',
        'Data Privacy (GDPR/DPDP)',
        'Startup Advisory',
        'AI Compliance',
      ],
      'firm-4': [
        'Criminal Defense',
        'Maritime Law',
        'White-Collar Crime',
        'Bail & Trial Advocacy',
        'Admiralty Disputes',
      ],
      'firm-5': [
        'Cyber Law',
        'Data Breach Incident Response',
        'Digital Evidence Forensics',
        'Cybercrime Defense',
        'IT Security Compliance',
      ],
    };

    const avatarColorMap: Record<string, string> = {
      'firm-1': 'blue',
      'firm-2': 'green',
      'firm-3': 'indigo',
      'firm-4': 'orange',
      'firm-5': 'teal',
    };

    const priceMap: Record<string, number> = {
      'firm-1': 180,
      'firm-2': 150,
      'firm-3': 140,
      'firm-4': 120,
      'firm-5': 200,
    };

    const practiceAreaCodeMap: Record<string, string> = {
      'firm-1': 'corporate',
      'firm-2': 'ip',
      'firm-3': 'technology',
      'firm-4': 'criminal',
      'firm-5': 'cyber',
    };

    const realFirmEntries: LawFirm[] = realFirms.map((f) => {
      const pAreas =
        firmPracticeAreasMap[f.id] ||
        (f.practiceArea ? [f.practiceArea] : ['Corporate Law', 'Civil Law']);
      const pCode =
        practiceAreaCodeMap[f.id] ||
        (f.practiceArea ? f.practiceArea.toLowerCase().replace(/\s+/g, '-') : 'corporate');
      const avatarCol = avatarColorMap[f.id] || 'blue';
      const hourlyPrice = priceMap[f.id] || (f.price && f.price < 1000 ? f.price : 150);

      return {
        id: f.id,
        name: f.name,
        subtitle: f.subtitle || `${pAreas[0]} • ${f.city}, ${f.state}`,
        description:
          f.description ||
          `${f.name} is a leading legal practice in ${f.city}, ${f.state}. Providing expert counsel in ${pAreas.slice(0, 3).join(', ')}.`,
        location: (f.location || f.city).toLowerCase().replace(/\s+/g, '-'),
        locationLabel: `${f.city}, ${f.state}`,
        practiceArea: pCode,
        availability: (f.availability || 'AVAILABLE').toUpperCase(),
        rating: f.rating || 4.8,
        reviews: f.reviews || 85,
        price: hourlyPrice,
        experience: f.experience || '10+ Years',
        bio:
          f.bio ||
          `${f.name} is a premier firm based at ${f.street}, ${f.city}. Specializing in ${pAreas.join(', ')}. Contact: ${f.email || f.primaryEmail || ''} | ${f.phone || ''}`,
        practiceAreas: pAreas,
        languages: ['English (Fluent)', 'Hindi (Fluent)'],
        education: [
          { school: 'National Law School of India', degree: 'B.A. LL.B. (Hons)' },
          { school: 'Bar Council of India', degree: 'Enrolled Advocate' },
        ],
        avatarColor: avatarCol,
        email: f.primaryEmail || f.email,
        phone: f.phone,
        address: `${f.street}, ${f.city}, ${f.state} - ${f.pinCode}`,
        website: f.website,
      };
    });

    this.firms = realFirmEntries;
  }

  // ── findAll with filter + sort ────────────────────────────────────────────
  findAll(filters: LawFirmFilters): LawFirmResponseDto[] {
    let results = [...this.firms];

    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(kw) ||
          f.subtitle.toLowerCase().includes(kw) ||
          f.description.toLowerCase().includes(kw) ||
          f.bio.toLowerCase().includes(kw) ||
          f.practiceAreas.some((p) => p.toLowerCase().includes(kw)),
      );
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      results = results.filter(
        (f) =>
          f.location.toLowerCase().includes(loc) ||
          f.locationLabel.toLowerCase().includes(loc),
      );
    }

    if (filters.practiceArea) {
      const pa = filters.practiceArea.toLowerCase();
      results = results.filter(
        (f) =>
          f.practiceArea.toLowerCase() === pa ||
          (pa === 'ip' &&
            (f.practiceArea.toLowerCase().includes('ip') ||
              f.practiceArea.toLowerCase().includes('intellectual'))) ||
          (pa === 'corporate' &&
            (f.practiceArea.toLowerCase().includes('corporate') ||
              f.practiceArea.toLowerCase().includes('civil'))) ||
          f.practiceAreas.some((p) => p.toLowerCase().includes(pa)) ||
          f.subtitle.toLowerCase().includes(pa),
      );
    }

    switch (filters.sortBy) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'reviews':
        results.sort((a, b) => b.reviews - a.reviews);
        break;
      case 'availability': {
        const avOrder: Record<string, number> = { AVAILABLE: 0, TODAY: 1, BUSY: 2 };
        results.sort(
          (a, b) => (avOrder[a.availability] ?? 3) - (avOrder[b.availability] ?? 3),
        );
        break;
      }
      case 'rating':
      default:
        results.sort((a, b) => b.rating - a.rating);
        break;
    }

    return results.map(this.toDto);
  }

  // ── findOne ───────────────────────────────────────────────────────────────
  findOne(id: string): LawFirmResponseDto {
    const firm = this.firms.find((f) => f.id === id);
    if (!firm) {
      throw new NotFoundException(`Law firm with ID "${id}" not found`);
    }
    return this.toDto(firm);
  }

  // ── mapper ────────────────────────────────────────────────────────────────
  private toDto(f: LawFirm): LawFirmResponseDto {
    return {
      id:            f.id,
      name:          f.name,
      subtitle:      f.subtitle,
      description:   f.description,
      location:      f.location,
      locationLabel: f.locationLabel,
      practiceArea:  f.practiceArea,
      availability:  f.availability,
      rating:        f.rating,
      reviews:       f.reviews,
      price:         f.price,
      experience:    f.experience,
      bio:           f.bio,
      practiceAreas: f.practiceAreas,
      languages:     f.languages,
      education:     f.education,
      avatarColor:   f.avatarColor,
      email:         f.email,
      phone:         f.phone,
      address:       f.address,
      website:       f.website,
    };
  }
}
