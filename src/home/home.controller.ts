import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PropretyType, UserType } from '@prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User, UserInfo } from 'src/user/decorators/user.decorator';
import {
  CreateHomeDto,
  HomeResponseDto,
  InquireDto,
  UpdateHomeDto,
} from './dtos/home.dto';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHomes(
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('propretyType') propretyType?: PropretyType,
  ): Promise<HomeResponseDto[]> {
    const price =
      minPrice || maxPrice
        ? {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          }
        : undefined;

    const filters = {
      ...(city && { city }),
      ...(price && { price }),
      ...(propretyType && { proprety_type: propretyType }),
    };

    return this.homeService.getHomes(filters);
  }

  @Get(':id')
  getHome(@Param('id', ParseIntPipe) id: number) {
    return this.homeService.getHomeById(id);
  }

  @Roles(UserType.REALTOR)
  @Post()
  createHome(@Body() body: CreateHomeDto, @User() user: UserInfo) {
    return this.homeService.createHome(body, user.id);
  }

  @Roles(UserType.REALTOR)
  @Put(':id')
  async updateHome(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHomeDto,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeId(id);

    if (realtor.realtor.id !== user.id) {
      throw new UnauthorizedException();
    }

    return this.homeService.updateHome(id, body);
  }

  @Roles(UserType.REALTOR)
  @Delete(':id')
  async deleteHome(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeId(id);
    if (realtor.realtor.id !== user.id) {
      throw new UnauthorizedException();
    }
    return this.homeService.deleteHome(id);
  }

  @Roles(UserType.BUYER)
  @Post('/:id/inquire')
  inquire(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: UserInfo,
    @Body() { message }: InquireDto,
  ) {
    return this.homeService.inquire(user, homeId, message);
  }

  @Roles(UserType.REALTOR)
  @Get('/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeId(homeId);
    if (realtor.realtor.id !== user.id) {
      throw new UnauthorizedException();
    }

    return this.homeService.getMessagesByHome(homeId)
  }
}
