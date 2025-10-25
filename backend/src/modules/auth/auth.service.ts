import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (user && await user.validatePassword(password)) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Update last login
      user.lastLoginAt = new Date();
      await this.usersRepository.save(user);

      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      email: user.email, 
      sub: user.id,
      organizationId: user.organization.id,
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organization: user.organization,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create organization
    const organization = this.organizationsRepository.create({
      name: registerDto.companyName,
      slug: await this.generateSlug(registerDto.companyName),
    });

    await this.organizationsRepository.save(organization);

    // Create user
    const user = this.usersRepository.create({
      ...registerDto,
      organization,
      role: registerDto.role || 'admin', // First user becomes admin
    });

    await this.usersRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  async refreshToken(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user || !(await user.validatePassword(currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = newPassword;
    await this.usersRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  private async generateSlug(companyName: string): Promise<string> {
    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.organizationsRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}