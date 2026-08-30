import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { Case } from './interfaces/case.interface';

@Injectable()
export class CasesService {
  private cases: Case[] = [];
  private idCounter = 1;

  constructor() {
    this.seedCases();
  }

  private seedCases() {
    const now = new Date().toISOString();
    this.cases = [
      {
        id: this.idCounter++,
        cnr: 'DL-2024-CR-100001',
        case_type: 'Criminal Defense',
        brief_description: 'State vs John Doe - Narcotics investigation & trial defense',
        status: 'Active',
        filed_date: '2024-01-15',
        created_at: now,
        lawfirm_id: 'firm-1',
        client_id: 'user-2', // Client Alice
        lawyer_id: 'user-3', // Lawyer Bob (Sharma & Associates)
        progress: 65,
        team: [{ id: 'user-3', name: 'Bob', role: 'Lead Defense Counsel' }],
        timeline: [
          { title: 'Bail Application Granted', date: '2024-01-20', desc: 'Court approved conditional bail.' },
          { title: 'Evidence Examination', date: '2024-02-14', desc: 'Cross-examination of prime witness completed.' },
          { title: 'Trial Hearing Scheduled', date: '2024-06-12', upcoming: true, desc: 'Final arguments in session room 4.' }
        ]
      },
      {
        id: this.idCounter++,
        cnr: 'MH-2024-CV-100002',
        case_type: 'Civil & Property',
        brief_description: 'Property partition dispute - Sharma vs Gupta real estate title',
        status: 'Ongoing',
        filed_date: '2024-02-20',
        created_at: now,
        lawfirm_id: 'firm-2',
        client_id: 'user-2', // Client Alice
        lawyer_id: 'user-13', // Lawyer Rahul (Khanna & Co)
        progress: 40,
        team: [{ id: 'user-13', name: 'Rahul', role: 'Senior Civil Advocate' }],
        timeline: [
          { title: 'Partition Suit Filed', date: '2024-02-20', desc: 'Initial plaint registered under CPC.' },
          { title: 'Court Commissioner Survey', date: '2024-03-25', desc: 'Site demarcation survey report submitted.' }
        ]
      },
      {
        id: this.idCounter++,
        cnr: 'KA-2024-CP-100003',
        case_type: 'Corporate & IP',
        brief_description: 'Contract breach & software IP licensing dispute - TechCorp vs SoftSystems',
        status: 'Under Review',
        filed_date: '2024-03-05',
        created_at: now,
        lawfirm_id: 'firm-3',
        client_id: 'user-2', // Client Alice
        lawyer_id: 'user-9', // Lawyer David (Tech Legal Bangalore)
        progress: 25,
        team: [{ id: 'user-9', name: 'David', role: 'Corporate IP Counsel' }],
        timeline: [
          { title: 'Legal Notice Served', date: '2024-03-05', desc: 'Section 138 & breach notice delivered.' },
          { title: 'Arbitration Invocation', date: '2024-04-10', desc: 'Sole arbitrator appointment in progress.' }
        ]
      },
    ];
  }

  create(createCaseDto: CreateCaseDto): Case {
    const newCase: Case = {
      id: this.idCounter++,
      ...createCaseDto,
      created_at: new Date().toISOString(),
      status: createCaseDto.status || 'Active',
    };
    this.cases.push(newCase);
    return newCase;
  }

  findAll(filters: {
    firmId?: string;
    clientId?: string;
    lawyerId?: string;
  }): Case[] {
    let filteredCases = [...this.cases];

    if (filters.firmId) {
      filteredCases = filteredCases.filter(c => c.lawfirm_id === filters.firmId);
    }
    if (filters.clientId) {
      filteredCases = filteredCases.filter(c => c.client_id === filters.clientId);
    }
    if (filters.lawyerId) {
      filteredCases = filteredCases.filter(c => c.lawyer_id === filters.lawyerId);
    }

    return filteredCases;
  }

  findOne(id: any): Case {
    const numericId = Number(id);
    const found = this.cases.find(c => Number(c.id) === numericId);
    if (!found) throw new NotFoundException(`Case with ID ${id} not found`);
    return found;
  }

  update(id: any, updateCaseDto: UpdateCaseDto): Case {
    const numericId = Number(id);
    const caseIndex = this.cases.findIndex(c => Number(c.id) === numericId);
    if (caseIndex === -1) throw new NotFoundException(`Case with ID ${id} not found`);

    this.cases[caseIndex] = {
      ...this.cases[caseIndex],
      ...updateCaseDto,
    };
    return this.cases[caseIndex];
  }

  remove(id: any): void {
    const numericId = Number(id);
    const caseIndex = this.cases.findIndex(c => Number(c.id) === numericId);
    if (caseIndex === -1) throw new NotFoundException(`Case with ID ${id} not found`);
    this.cases.splice(caseIndex, 1);
  }
}
